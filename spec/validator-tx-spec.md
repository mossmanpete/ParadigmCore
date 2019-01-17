# `ValidatorUpdate` Transaction Specification (WIP)

Building on top of the established [Ethereum -> OrderStream](./ethereum-peg-spec.md) one-way peg developed to track "posters" who have made a stake in the `PosterStake` Ethereum contract for write access to the OrderStream network, this specification outlines the internal† `validator` transaction type using the same `Witness` model. 

*† "internal" in this context means it is a transaction type that will never originate from a non-validator node, unlike `order` and `stream` transactions which can originate from end users. Like all OrderStream transaction types, `ValidatorUpdate` transactions must be signed by validators.*

## Overview
At a high level, this transaction type is created by validators running `Witness` components who react to and report events from the `ValidatorRegistry` contract. The events are emitted under the following circumstances.

1. A new validator has been accepted into the registry
1. A validator has been removed via vote
1. A validator has been removed via slashing
1. A validator has been removed due to insufficient balance in the `Treasury`

The state transition applied by a `ValidatorUpdate` transaction depends on the following conditions, parameters, and state objects.

1. Current `state.validators` object's contents
1. Current sum of network vote power
1. Current sum of validator staked balances
1. Integer amount of staked tokens associated with the validator listing event
1. The `ed25519` public key included with validator listing event

`RegistryUpdate`†† events emitted from the `ValidatorRegistry` contract contain the following parameters necessary to effect state change on the OrderStream network.

|Name|Solidity type|Encoding target|Description|
|-|-|-|-|
|`tendermintPublicAddress`|`string`/`bytes32`|base64 via UTF8|Tendermint `ed25519` validator public key|
|`owner`|`address`|hex via UTF8| Ethereum address of validator applicant|
|`stake`|`uint` (?)|dec via UTF8 (?)| Slashable amount associated with listing

The block height of the event is also associated with the above data. The following parameters are computed by the state machine upon receipt and acceptance of an event (according to the [peg specification](./ethereum-peg-spec.md)).

2. Tendermint `NODE_ID` of new validator (derived from `tendermintPublicAddress`)
3. Vote power of new validator (computed based on in-state stake balances)

*†† the name `RegistryUpdate` does not reflect the current implementation of the events in the `ValidatorRegistry` contract, but is used here to a) describe that separate `ValidatorAdded` and `ValidatorRemoved` events are redundant, and b) to avoid confusion with the OrderStream `ValidatorUpdate` transaction type. No names discussed in this specification are final.*

## Formal Specification

WIP

