---
title: Validator Selection
---

# Specification for Dynamic Validator Updates

Building on top of the established [Ethereum -> OrderStream](./ethereum-peg-spec.md) one-way peg developed to track "posters" who have made a stake in the `PosterStake` Ethereum contract for write access to the OrderStream network, this specification outlines a modification to the internal<sup>[[1]](#1)</sup> `witness` transaction type, and accompanying changes in the core state machine. 

Combined with the [`ValidatorRegistry`](https://github.com/ParadigmFoundation/ParadigmContracts/blob/master/contracts/ValidatorRegistry.sol) contract, the implementation of this specification will support dynamic changes to the active OrderStream validator set based on the state of the on-chain registry.

## Overview
At a high level, this transaction type is created by validators running `Witness` components who react to and report events from the `ValidatorRegistry` contract. The events are emitted under the following circumstances.

1. A new validator has been accepted into the registry
1. A validator has been removed via vote
1. A validator has been removed via slashing
1. A validator has been removed due to insufficient balance in the `Treasury`

The state transition applied by a `ValidatorUpdate` transaction depends on the following conditions, parameters, and state objects.

1. Current `state.validators` object's contents
1. Current sum of validator vote power
1. Current sum of validator staked balances
1. Integer amount of staked tokens associated with the validator listing event
1. The tendermint `ed25519` public key included with validator listing event

`RegistryUpdate`<sup>[[2]](#2)</sup> events emitted from the `ValidatorRegistry` contract contain the following parameters necessary to effect state change on the OrderStream network.

|Name|Solidity type|JS type|Description|
|-|-|-|-|
|`tendermintPublicKey`|`string`|`Buffer`|Tendermint `ed25519` validator public key|
|`owner`|`address`|`string`| Ethereum address of validator applicant|
|`stake`|`uint`|`bigint`| Slashable staked balance associated with listing|

The block height of the event is also associated with the above data. The following parameters are deterministically computed by the state machine upon receipt and acceptance of an event (according to the [peg specification](./ethereum-peg-spec.md)).

1. Tendermint `NODE_ID` of new validator [is derived from `tendermintPublicKey`](https://github.com/ParadigmFoundation/ParadigmCore/blob/master/src/util/static/valFunctions.ts#L23).
1. Vote power of new validator is computed based on in-state stake balances. 
   - A similar function used for [bandwidth model can be found here](https://github.com/ParadigmFoundation/ParadigmCore/blob/dev/src/core/util/utils.ts#L115).

## Formal Specification

This section (more) formally defines the changes to the `witness` transaction type, and the processes associated with the implementation of dynamic validator set changes on the OrderStream network. For the purposes of this specification, the inner workings of the `ValidatorRegistry` contract – and the rest of the Paradigm contract system – is treated as a higher-level abstraction.

This section outlines one of several potential triggers and effects, but remains generally accurate for all cases.

The process outlined below is specific to the core state machine, and omits several dependant steps for the sake of brevity and clarity.

1. A new validator listing is accepted into the `ValidatorRegistry` contract
1. The `RegistryUpdate` event is emitted in the same block as the listing is accepted
1. OrderStream validators observe the event and:
   1. Wait for the maturity block associated with the event (see peg spec for details)
   1. Construct and sign `witness` attestation transactions, "voting" for its validity
   1. Each validator submits their witness account transaction to as many validators on the network as they are aware of.
1. Upon receipt of the witness attestations, the existing state machine logic in ParadigmCore deterministically handles the following process(es) according to the peg specification:
    1. Waiting for >=2/3 of active validators to submit attestations to the `RegistryUpdate` event in question
    1. Transitioning the event from the pending `state.events` object to the `state.validators` object upon confirmation of the event
    1. Pruning confirmed `witness` events from `state.events` (already [implemented here](https://github.com/ParadigmFoundation/ParadigmCore/blob/master/src/core/util/utils.ts#L234))
    1. Some relevant logic outlining the modification to the `witness` data structure ([see current implementation](https://github.com/ParadigmFoundation/ParadigmCore/blob/master/src/core/handlers/witness.ts)) for more detail):
    ```ts
    // snippet - for illustrative purposes

    function applyBalanceUpdate(tx: SignedWitnessTx, state: State): void {

        // return immediately if event is not confirmed
        if (state.events[tx.data.block].conf < calcByzantineSize(state)) {
            return;
        }

        // apply necessary state transition on confirmed events
        switch (tx.data.type) {

            // event dictates balance increase for target account
            case "add": {
                if (tx.data.subject === "poster") {
                    state.posters[tx.data.account].balance += amount;
                } else if (tx.data.subject === "validator") {
                    state.validators[tx.data.account].balance += amount;
                }
                break;
            }

            // event dictates balance decrease for target account
            case "remove": {
                if (tx.data.subject === "poster") {
                    state.posters[tx.data.account].balance -= amount;
                } else if (tx.data.subject === "validator") {
                    state.validators[tx.data.account].balance -= amount;
                }
                break;
            }

            // safety
            default: { break; }
        }

        // remove events that were just applied to state
        delete state.events[tx.data.block][tx.data.account];

        // remove event block entry if empty
        if (Object.keys(state.events[tx.data.block]).length === 0) {
            delete state.events[tx.data.block];
        }

        // remove balance entry if now empty
        switch (tx.data.subject) {
            case "poster": {
                if (state.posters[tx.data.account].balance === 0n) {
                    delete state.posters[tx.data.account];
                }
            }

            case "validator": {
                if (state.validators[tx.data.account].balance === 0n) {
                    delete state.validators[tx.data.account];
                }
            }
        }

        // update highest event block accepted
        if (state.lastEvent[tx.data.type] < block) {
            state.lastEvent[type] = block;
        }

        // function always returns void
        return;
    }
    ```
    - An implementation such as the one above will allow:
        - The existing logic for tracking poster balance to remain unchanged
        - The new logic for validator balance tracking to use the same functions and state transition logic.
1. At the end of each block, during the `EndBlock` execution, the state machine performs the following:
    1. Iterate and sum staked (slashable) DIGM balances over all active validators in `state.validators`.
    1. Compute the proportional vote power for each validator.
    1. Example implementation of these steps:
    ```ts
    // snippet - for illustrative purposes

    function endBlock(state: State): ValidatorUpdate[] {

        // ... steps omitted

        // validator updates to effect
        let validatorUpdates:   ValidatorUpdate[];   
        
        // will store sum of all staked validator balances
        let totalStake: bigint = 0n;

        // sum all validator stake
        for (let i = 0; i < state.validators.length; i++) {

            // current validator object (for clarity/explicitness)
            const validator: Validator = state.validators[i];

            // add staked balance to total
            totalStake += validator.stake;
        }

        // compute proportional power for each based on stake
        for (let i = 0; i < state.validators.length; i++) {
            
            // current validator object and key
            const validator: Validator = state.validators[i];
            const pubKey: Buffer = validator.pubKey;

            // set to 0 if validator was removed 
            const isRemoved: boolean = validator.balance === 0n;

            // will be new validator vote power
            let power: bigint;

            // set to 0 power if removed, proportional otherwise
            power = isRemoved ? 0n : validator.stake / totalStake;

            // add validator update to updates array
            validatorUpdates.push({pubKey, power});
        }

        // ... steps omitted

        // effect validator set updates for next block
        return validatorUpdates;
    }
    ```
1. After the previous step is completed, and that Tendermint block passes `commit()`, the new validator will be able to join the network and begin proposing and voting on blocks.

## Final Thoughts

- While drafting this I realize it will be necessary to restructure the `state` object to contain distinct `state.validators` (already exists) and `state.posters` objects to track balances, rather than a `state.balances` object.

- Implementing this spec will also require significantly refactoring the `state.validators` object, and the `endBlock()`, `beginBlock()`, `deliverWitness()`, and `checkWitness()` functions. The `Witness` class will also need to be modified to support the updated `witness` transaction type.

## Footnotes

<a name="1">1</a> The word "internal" in this context means it is a transaction type that will never originate from a non-validator node, unlike `order` and `stream` transactions which can originate from end users. Like all OrderStream transaction types, `ValidatorUpdate` transactions must be signed by validators.

<a name="2">2</a> The name `RegistryUpdate` __does not__ reflect the current implementation of the events in the [`ValidatorRegistry`](https://github.com/ParadigmFoundation/ParadigmContracts/blob/master/contracts/ValidatorRegistry.sol) contract, but is used here to a) demonstrate that separate `ValidatorAdded` and `ValidatorRemoved` events are redundant, and b) to avoid confusion with the OrderStream `ValidatorUpdate` transaction type. No names discussed in this specification are final.


