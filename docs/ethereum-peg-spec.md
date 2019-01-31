---
title: Ethereum Peg
---

# OrderStream/Ethereum Peg Zone and Finality Gadget

_NOTE: this project is currently a WIP, so details of the implementation are likely to change. I'll strive to keep this doc up to date with changes. Last updated: 27 December 2018._

A one-way "peg zone" implementation is necessary for the OrderStream network to: 
1) Establish "true" finality for Ethereum events that otherwise only have weak (probabilistic) finality guarantee.
2) Reach consensus about the state (balances) of the MakerStaking contract.
3) Accept data (via events) from Ethereum into the OrderStream's state, which is then used to validate external transactions.

The solution this document outlines implements a shared security model, where OrderStream validators are also full Ethereum nodes that act as witnesses to events from a specific contract address.

### UPDATE (12/21/18):
The implementation of this spec can be found at [`src/async/Witness.ts`](../src/async/Witness.ts).

## Background/Terminology
- The finality threshold is an arbitrary maturity that blocks must reach before events within that block can modify the OrderStream’s state.
- This block maturity (`x`) is agreed upon by validators to establish pseudo-finality for events and blocks on Ethereum. 
- Staking periods are of fixed length, and based on Ethereum block height.
- If a stake is made in staking period `i`, the staker will have write access to the network from staking period `i+1` until they remove their stake.
- A bandwidth model is implemented to construct a rate-limit mapping that proportionally allocates network throughput to stakers based on stake size.
- The `Witness` is a class in `ParadigmCore` that is instantiated as a subprocess upon node initialization. Only validators must run `Witness` instances. It is responsible for listening to Ethereum events via local Ethereum client RPC(Geth/Parity), and submitting special state-modifying and voting transactions to the ABCI application and other validators at appropriate times (outlined below).
- The state of the network is represented by the following data structure (genesis state shown):
    ```js
    // state.ts - genesis state

    {
        "round": {          // staking period information
            "number":   0,  // staking period counter
            "startsAt": 0,  // period starting height (ethereum)
            "endsAt":   0   // period ending height (ethereum)
        },
        "events":   {},     // stake events awaiting witness confirmation
        "balances": {},     // confirmed raw balances (amount staked)
        "limits":  {},      // computed and current rate-limit mapping 
        "validators": {},   // information about current and historical validators
        "lastEvent": {      // information about Ethereum events
            "add": 0,       // last StakeMade event
            "remove": 0     // last StakeRemoved event
        },
        "consensusParams": {
            "finalityThreshold": null,  // required block maturity (x)
            "periodLength": null,       // in Ethereum blocks
            "periodLimit": null,        // number of orders per period
            "maxOrderBytes": null,      // maximum order broadcast size
            "confirmationThreshold": null   // == 2/3 current validator set 
        },
        "orderCounter": 0,      // number of orders accepted on the network
        "lastBlockHeight":  0,  // last Tendermint block height
        "lastBlockAppHash": null,   // the hash of the last valid block
        "matureEthBlock": null      // latest Ethereum block that has reached "finality"
    }
    ```
- `StakeEvent`s are stored in `state.events` while awaiting witness confirmation, and are indexed by the height of the block the event occurred in:
    ```js
    // state.ts - snippet
    {
        // ...
        "events": {
            "4124023": {    // all events that were picked up in this block
                "0x..." : { // address of the staking party is the key
                    "amount": 5000000,  // raw value staked (units arbitrary)
                    "type": "remove",   // determines if modification is + or -
                    "conf": 1           // number of witness confirmations
                }
                // ...
            }
            // ...
        }
        // ...
    }
    ```
    Events are indexed by block so that state modifications for events occurring in blocks just reaching maturity `x` can quickly be executed when the "finality block" for those events is found.
    
- When consensus is reached about stake events, the confirmed balances are stored in `state.balances` in the following format:
    ```js
    // state.ts - snippet

    {
        // ...
        "balances": {
            "0x...4e": 451736,  // raw staked balances (units 1*10^-18)
            "0x...Hj": 1203,
            "0x...71": 624519
            // ...
        }
        // ...
    }
    ```
- Finalized rate-limit mappings are stored in-state:
    ```js
    // state.ts - snippet

    {
        // ...
        "limits": {
            "0x...4e": { // address of staker (poster)
                // computed proportional order limit per staking period
                "orderLimit":  4372,
                // stream limit is always 1, regardless of stake size
                "streamLimit": 1 
            }
        }
        // ...
    }
    ```

## Formal Description
These processes are kicked off upon network initialization, and are a crucial part of normal network functionality (validating and broadcasting orders). You can view the implementation of this procedure in [`src/abci`](../src/abci), and [`src/async`](../src/async). These modules are in the process of being refactored.
1. If a market maker (or agent operating on behalf of one) wishes to use the OS network, they must deposit the appropriate ERC-20 token into the staking contract.
2. A `StakeMade` or `StakeRemoved` event is emitted by the contract, including the staker's address and the amount staked, as well as the Ethereum block number the transaction was included in (block `n`).
3. The active `Witness` instance on an OrderStream node receives the event, and records the corresponding "finality block" height for that event as `n + x`, where `n` is the block height the event was included in.
4. Once Ethereum block `n + x` is found, the `Witness` executes a local ABCI transaction, submitting the event transaction to the node's local mempool.
5. The event data is added to state (in `state.events`), including the 1 vote from the witness that first submitted the event.
6. As other validator nodes pick up the "finality block" for that event, they submit the event data to the network as well.
7. As each event witness transaction is recorded, the number of witness confirmations for that event is increased:
    ```js
    // in deliverTx ()
    // pseudocode - illustrating witness confirmation process

    function deliverTx(request) {
        // ...

        // State  executed on  valid 'rebalance' tx's 
        state.events[blockNumber][address].conf += 1;

        // ..
    }
    ```
8. Once enough validators (2/3 of active, potentially more) have submitted witness accounts of the event, the events state modification is applied to the corresponding balance in `state.balances`.
9. If the staker does not currently have any tokens staked, a new entry is added to `state.balances` with the quantity defined by the event:
    ```js
    // in deliverTx()
    // pseudocode - for illustrative purposes

    if (state.events[blockNumber][address].conf >= state.consensusParams.confirmationThreshold) {
        if (state.balances.hasOwnProperty(address)) {
            switch (event.type) {
                case "StakeMade": {
                    state.balances[address] += event.amount;
                    break;
                }
                case "StakeRemoved": {
                    state.balances[address] -= event.amount;
                    break;
                }
            }
        } else {
            // if there is no balance, event must be StakeMade
            state.balances[address] = event.amount;
        }
    }
    ```
10. If the staker already has an entry in `state.balances`, the state transition from the event is applied to their balance (i.e. if it was a `StakeMade` event, the corresponding amount is added to their balance, if it was a `StakeRemoved` event, the amount is subtracted).
11. At fixed intervals (once the round end height for that period is reached), an arbitrary validator will submit a `rebalance` transaction including a proposal for the new rate-limit mapping. If adopted into state, the mapping is used in the next period. Note: it does not matter if many validators submit proposals at the same time since only one can be accepted. In fact, they all should submit proposals if they are in sync with Ethereum and the OrderStream, and are functioning properly.
12. Upon receipt of a `rebalance` transaction, a validator node will construct a rate-limit mapping based on the current in-state balances (from `state.balances`).
13. The receiving validator will compare the newly constructed local mapping to the proposed mapping included in the `rebalance` transaction. If they match, the validator votes to adopt the proposed mapping. Ex:
    ```js
    // pseudocode - this isn't actually how Tendermint works

    let proposal = tx.data // incoming proposed mapping

    if (proposal === constructMapping(state.balances)) {
        state.limits = proposal
        return "valid";
    } else {
        return "invalid";
    }
    ```
14. If enough validators vote to accept the proposal, it is adopted in-state as the new rate-limit mapping (in `state.limits`) and used for the next staking period. 
