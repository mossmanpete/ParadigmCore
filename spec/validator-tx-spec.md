# `ValidatorUpdate` Transaction Specification (WIP)

**Update**: my current thinking is to encompass a `subject` parameter into the existing `witness` transaction type, instead of creating a entirely separate transaction type for validator update events. The reasoning is that from the perspective of the state machine, the poster staking events and validator update events can be treated the same. In reality they are both simply events from the Ethereum chain that trigger a deterministic modification to the OrderStream's state. The logic for attestations refering to different `witness.subject`s will be integrated into `deliverTx(). This will be reflected in another version of this spec.  

Building on top of the established [Ethereum -> OrderStream](./ethereum-peg-spec.md) one-way peg developed to track "posters" who have made a stake in the `PosterStake` Ethereum contract for write access to the OrderStream network, this specification outlines the internal† `validator` transaction type using the same `Witness` model. 

*† The word "internal" in this context means it is a transaction type that will never originate from a non-validator node, unlike `order` and `stream` transactions which can originate from end users. Like all OrderStream transaction types, `ValidatorUpdate` transactions must be signed by validators.*

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

`RegistryUpdate`†† events emitted from the `ValidatorRegistry` contract contain the following parameters necessary to effect state change on the OrderStream network.

|Name|Solidity type|Encoding target|Description|
|-|-|-|-|
|`tendermintPublicAddress`|`string`/`bytes32`|base64 via UTF8|Tendermint `ed25519` validator public key|
|`owner`|`address`|hex via UTF8| Ethereum address of validator applicant|
|`stake`|`uint` (?)|dec via UTF8 (?)| Slashable DIGM amount associated with listing

The block height of the event is also associated with the above data. The following parameters are deterministically computed by the state machine upon receipt and acceptance of an event (according to the [peg specification](./ethereum-peg-spec.md)).

1. Tendermint `NODE_ID` of new validator [is derived from `tendermintPublicAddress`](https://github.com/ParadigmFoundation/ParadigmCore/blob/master/src/util/static/valFunctions.ts#L23).
1. Vote power of new validator is computed based on in-state stake balances. A similar function used for [bandwidth model can be found here](https://github.com/ParadigmFoundation/ParadigmCore/blob/dev/src/core/util/utils.ts#L115).

*†† The name `RegistryUpdate` __does not__ reflect the current implementation of the events in the [`ValidatorRegistry`](https://github.com/ParadigmFoundation/ParadigmContracts/blob/master/contracts/ValidatorRegistry.sol) contract, but is used here to a) demonstrate that separate `ValidatorAdded` and `ValidatorRemoved` events are redundant, and b) to avoid confusion with the OrderStream `ValidatorUpdate` transaction type. No names discussed in this specification are final.*

## Formal Specification

This section (more) formally defines the `ValidatorUpdate` transaction type, and the processes associated with the implementation of dynamic validator set changes on the OrderStream network. For the purposes of this specification, the inner workings of the `ValidatorRegistry` contract – and the rest of the Paradigm contract system – is treated as a higher-level abstraction.

This section outlines one of several potential triggers and effects, but remains generally accurate for all cases.

The process outlined below is specific to the core state machine, and omits several dependant steps for the sake of brevity and clarity.

1. A new validator listing is accepted into the `ValidatorRegistry` contract
1. The `RegistryUpdate` event is emitted in the same block as the listing is accepted
1. OrderStream validators observe the event and:
   1. Wait for the maturity block associated with the event (see peg spec for details)
   1. Construct and sign `ValidatorUpdate` transactions, attesting to the event
   1. Each validator submits their witness account transaction††† to as many validators on the network as they are aware of
1. Upon receipt of the witness††† attestations, the existing state machine logic in ParadigmCore deterministically handles the process(es) according to the peg specification:
    1. Waiting for >=2/3 of active validators to submit attestations to the `RegistryUpdate` event in question
    1. Transitioning the event from the pending `state.events` object to the `state.validators`†††† object upon confirmation of the event
    1. Pruning confirmed `RegistryUpdate` events from `state.events`
1. At the end of each block, during the `EndBlock` execution, the state machine performs the following:
    1. Iterate and sum staked (slashable) DIGM balances over all active validators in `state.validators`††††
    1. Compute the following:
    ```ts
    // snippet - actual implementation will differ

    function endBlock(state: State): ValidatorUpdate[] {

        // ... steps omitted
        
        let totalBalance:       bigint;             // sum of validator staked balances
        let validatorUpdates:   ValidatorUpdate[];  // validator updates to effect 
        
        // ... steps omitted

        for (let i = 0; i < state.validators.length; i++) {
            
            // current validator object and key
            const validator: ValidatorInfo = state.validators[i];
            const pubKey: Buffer = validator.pubKey;

            // set to 0 if validator was removed 
            const isRemoved: boolean = validator.balance === 0n;

            // will be new validator vote power
            let power: bigint;

            // set to 0 power if removed, proportional otherwise
            if (isRemoved) {
                power = 0n;
            } else {
                power = validator.balance / totalBalance;
            }

            // add validator update to updates array
            validatorUpdates.push({pubKey, power});
        }

        // effect validator set updates
        return validatorUpdates;
    }
    ```
1. After the previous step is completed, and that Tendermint block passes `commit()`, the new validator will be able to join the network and begin proposing and voting on blocks.
1. _... to be expanded_

*††† The decision of weather to a) modify the existing `witness` transaction type to support `ValidatorUpdate`s or b) create a new transaction type has not been made yet. This specification (and it's terminology) will be updated when that decision is made.*

*†††† The decision of wheather to a) modify the existing `state.balances` object to store validator balances or b) incorporate validator balances into the `state.validators` data structure has not yet been made. This spec will be updated upon a decision being made.*

## Final Note(s)

While drafting this I realize it will be necessary to restructure the `state` object to contain distinct `state.validators` (already exists) and `state.posters` objects to track balances, rather than a `state.balances` object.

Implementing this spec will also require significantly refactoring the `state.validators` object, and the `endBlock()`, `beginBlock()`, `deliverWitness()`, and `checkWitness()` functions. The `Witness` class will also need to be modified to support the updated `witness` transaction type.
