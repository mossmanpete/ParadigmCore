# OrderStream/Ethereum Peg Zone and Finality Gadget
A one-way "peg zone" implementation is necessary to 1) establish "true" finality for Ethereum events that otherwise only have weak (probabalistic) finality gauruntees, and 2) accept data (via events) from Ethereum into the OrderStream's state. This implementation is laid out below.

## Background/Terminology
- The finality threshold is an arbitrary number of blocks agreed upon by validators to establish finality for events and blocks on Ethereum. This threshold is referenced as `x`.
- Staking periods are of fixed length, and based on Ethereum block height.
- If you make a stake in staking period `i`, you will have network access from staking period `i+1` until you remove your stake.
- `StakeRebalancer` a primitive class of `ParadigmCore` that is instantiated upon node initialization. It is responsible for listening to Ethereum events via local RPC, and submitting state-modifying transactions to the ABCI application at appropriate times.
- The state of the network is represented by the following data structure (genesis state shown):
    ```js
    // state.ts - genesis state

    {
        "round": {          // staking period information
            "number":   0,  // staking period counter
            "startsAt": 0,  // starting height (ethereum)
            "endsAt":   0   // ending height (ethereum)
        },
        "events":   {},     // stake events awaiting witness confirmation
        "balances": {},     // finalized raw balances (amount staked)
        "mapping":  {},     // computed rate-limit mapping
        "orderCounter": 0,  // number of orders accepted on the network
        "lastBlockHeight":  0,  // last Tendermint block height
        "lastBlockAppHash": ""; // the hash of the last valid block
    }
    ```
- A `StakeEvent` is stored in `state.events`, indexed by block number, while awaiting witness confirmation in the following format:
    ```js
    // state.ts - snippet
    {
        // ...
        "events": {
            "4124023": [ // all events that were picked up in this block
                {
                    "staker": "0x...",  // address of the staking party
                    "amount": 5000000,  // raw value staked (units arbitrary)
                    "type": "unstake"   // determines if modification is + or -
                    "conf": 1           // number of witness confirmations
                }
                // ...
            ]
            // ...
        }
        // ...
    }
    ```
    Events are indexed by block so that state modifications of corresponding staker balances (stored in `state.balances`) can be executed in the correct order once a sufficient number of witness confirmations is reached.
- When consensus is reached about stake events, the confirmed balances are stored in `state.balances` in the following format:
    ```js
    // state.ts - snippet

    {
        // ...
        "balances": {
            "0x...4e": 451736,  // raw staked balances
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
            "0x...4e": {
                // computed order limit per staking period
                "orderBroadcastLimit":  4372,

                "streamBroadcastLimit": 1 // always 1, see whitepaper
            }
        }
        // ...
    }
    ```
    The process of adopting this mapping will be elaborated on below.

## Formal Description
These processes are kicked off upon network initialization, and run repeatedly alongside normal network functionality (validating and broadcasting orders). You can view the implementation of this proceedure in [`src/abci`](../src/abci), and [`src/async`](../src/async).
1. A market maker wishes to use the OS network, so they deposit tokens into the staking contract.
2. A `StakeMade` or `StakeRemoved` event is emitted by the contract, including stakers address and stake size, as well as the Ethereum block number the transaction was included in (block `n`).
3. The `StakeRebalancer` class on an OrderStream node receives the event, and records the "finality block" height for that event as `n + x`.
4. Once Ethereum block number `n + x` is found, the `StakeRebalancer` executes and ABCI transaction and submits the event transaction to the node's local mempool.
5. The event data is added to state (in `state.events`), including the 1 vote from the witness that first submitted the event.
6. As other validator nodes pick up the "finality block" for that event, they submit the event data to the network as well.
7. As each event witness transaction is recorded, the number of "confirmations" for that event is increased. 
8. Once enough (2/3, potentially more) have submitted witness accounts of the event, the events state modification is applied to the corresponding balance in `state.balances`.
9. If the staker does not currently have any tokens staked, an entry is added to `state.balances` with the quantity from the event.
10. If the staker already has an entry in `state.balances`, the state transition from the event is applied to their balance (i.e. if it was a `StakeMade` event, the corresponding amount is added to their balance, if it was a `StakeRemoved` event, the amount is subtracted).
11. At fixed intervals (round end height for that period), an arbitrary validator will submit a `Rebalance` proposal including a new rate-limit mapping. If adopted into state, the mapping is used in the next period. 
12. Upon receipt of a `Rebalance` proposal, a validator node will construct a rate-limit mapping based on the in-state balances (from `state.balances`).
13. The receiving validator will compare the newly constructed mapping to the mapping included in the proposal, and if they match, the validator votes to adopt the proposed mapping. Ex:
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
14. If sufficient validators vote to accept the proposal, it is adopted in-state as the new rate-limit mapping (in `state.limits`) and used for the next staking period. 
