/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name state.d.ts
 * @module src/typings
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  14-November-2018
 * @date (modified) 14-November-2018
 *
 * Type definitions for ParadigmCore's state.
 */

/**
 * Outer level datastructure representing the state of the network, including
 * poster staked balances, poster rate limit, validator set, etc.
 */
interface State {
    round:              RoundInfo;
    events:             Events;
    balances:           Balances;
    limits:             Limits;
    lastEvent:          EventInfo
    validators:         Validators;
    orderCounter:       number;
    lastBlockHeight:    number;
    lastBlockAppHash:   string;
}

/**
 * Represents the status and parameters of the poster staking rounds. Block
 * numbers here refer to the height of the Ethereum blockchain.  
 */
interface RoundInfo {
    number:     number;
    startsAt:   number;
    endsAt:     number;
    limit:      number;
}

/**
 * The `state.events` mapping stores witness accounts of Ethereum events 
 * reported by validators, indexed by block number. `EventObjects` are stored 
 * here until sufficient validators submit witness accounts for that event, at 
 * which point the corresponding state-transition for the event is applied to 
 * the `state.balances` mapping.
 */
interface Events {
    [key: string]:  BlockEventObject;
}

/**
 * The inner-level mapping in `state.events` corresponding to each block number
 * index contains mappings (`EventObject`) indexed by the Ethereum address that
 * triggered the event, containing parameters of the event.
 */
interface BlockEventObject {
    [key: string]:  StakeEvent;
}

/**
 * A `RawStakeEvent` is simply an event object that has not been added to the 
 * in-state `state.events` mapping.
 */
interface RawStakeEvent {
    type:   string;
    staker: string;
    amount: BigInt;
    block:  number;
}

/**
 * `StakeEvents` are (currently) the only Ethereum event type implemented. The
 * data within `StakeEvents` is the information contained with the event emitted
 * by the Ethereum `PosterStaking` contract.
 */
interface StakeEvent {
    amount: BigInt;
    conf:   number;
    type:   string;
}

/**
 * The `state.balances` mapping contains the most updated and final balances of
 * stakers. The mapping is generated from events within `state.events` once each
 * event recieves sufficient witness confirmations.
 */
interface Balances {
    [key: string]:  BigInt | any;
}

/**
 * Rate limits are computed according to a bandwidth model based on each stakers
 * balance within the contract, and the total amount staked. `LimitObjects` are
 * stored in `state.limits`, with stakers Ethereum address as the keys.
 */
interface Limits {
    [key: string]:  LimitObject;
}

/**
 * Each staker is allocated a network throughput limit (for Order transactions)
 * proportional to stake size, and all stakers are allocated one (1) Stream
 * transaction per period, regardless of stake size.  
 */
interface LimitObject {
    orderLimit:     number;
    streamLimit:    number;
}

/**
 * The network must keep track of the Ethereum height of the latest event that
 * was applied to the networks state, to avoid replaying events already adopted
 * in-state. 
 */
interface EventInfo {
    add:    number;
    remove: number;
}

/**
 * Representation of the validator set in-state includes historical validators,
 * including validators that have been kicked off the network. The active
 * validator set is a computable sub-set of `state.validators`.
 */
interface Validators {
    [key: string]:  ValidatorInfo;
}

/**
 * For each validator, parameters regarding their historical activity is stored.
 * This allows interested parties to derive the active validator set, and audit
 * the historical actions of active and former validators.
 */
interface ValidatorInfo {
    lastProposed:   number;
    lastVoted:      number;
    totalVotes:     number;
    votePower:      number;
    active?:        boolean;    // @TODO: implement in state-machine
}