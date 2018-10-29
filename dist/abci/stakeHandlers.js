"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
  =========================
  ParadigmCore: Blind Star
  stakeHandlers.ts @ {dev}
  =========================

  @date_inital 23 October 2018
  @date_modified 23 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI Event Transactions.
*/
const Logger_1 = require("../util/Logger");
const Vote_1 = require("../util/Vote");
const CONF_THRESHOLD = 1;
/**
 * @name checkStake() {export function} use to perform mempool verification of
 * Ethereum StakeEvent transactions.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
function checkStake(tx, _) {
    if (isValidStakeEvent(tx.data)) {
        Logger_1.Logger.mempool("Stake witness transaction accepted.");
        return Vote_1.Vote.valid("Stake witness transaction accepted.");
    }
    else {
        Logger_1.Logger.mempoolWarn("Invalid witness event rejected.");
        return Vote_1.Vote.invalid("Invalid witness event rejected.");
    }
}
exports.checkStake = checkStake;
/**
 * @name deliverStake() {export function} perform state modification of Stake
 * Event transactions (modify staker's balance).
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 *
 * @todo: options for confirmation threshold
 * @todo: refactor and write some helper funcs, this is ugly
 */
function deliverStake(tx, state) {
    if (isValidStakeEvent(tx.data)) {
        // Stake event is structurally and syntactically valid
        let staker = tx.data.staker;
        let type = tx.data.type;
        let block = tx.data.block.toString();
        let amount = tx.data.amount;
        if (state.events.hasOwnProperty(block)) {
            if (state.events[block].hasOwnProperty(staker) &&
                state.events[block][staker].amount === amount) {
                // Event has already been added, we are just voting
                state.events[block][staker].conf += 1;
                console.log(state.events[block][staker].conf);
                if (state.events[block][staker].conf >= CONF_THRESHOLD) {
                    // This vote was the final confirmation
                    console.log('........ confirmed');
                    switch (state.balances.hasOwnProperty(staker)) {
                        case true: {
                            if (type === "add") {
                                state.balances[staker] += amount;
                            }
                            else if (type === "remove") {
                                state.balances[staker] -= amount;
                            }
                            delete state.events[block][staker];
                            if (Object.keys(state.events[block]).length === 0) {
                                delete state.events[block];
                            }
                            break;
                        }
                        case false: {
                            if (type !== "add") {
                                Logger_1.Logger.consensusWarn("(1) Potential consensus failure.");
                            }
                            state.balances[staker] = amount;
                            delete state.events[block][staker];
                            if (Object.keys(state.events[block]).length === 0) {
                                delete state.events[block];
                            }
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                    Logger_1.Logger.consensus("(2) Stake event confirmed, balances updated.");
                    return Vote_1.Vote.valid();
                }
                else {
                    Logger_1.Logger.consensus("(3) Witness transaction approved for pending event.");
                    return Vote_1.Vote.valid();
                }
            }
            else if (!(state.events[block].hasOwnProperty(staker))) {
                // Block is in state, but event is not
                state.events[block][staker] = {
                    "amount": amount,
                    "type": type,
                    "conf": 1
                };
                Logger_1.Logger.consensus("(4) Witness transaction approved for new event.");
                return Vote_1.Vote.valid();
            }
            else {
                Logger_1.Logger.consensusWarn("(5) Disagreement about event parameters.");
                return Vote_1.Vote.invalid("Disagreement about event parameters.");
            }
        }
        else {
            // Event block is not already in state
            state.events[block] = {};
            state.events[block][staker] = {
                "amount": amount,
                "type": type,
                "conf": 1
            };
            // REMOVE THE BLOCK BELOW BEFORE DEPLOYING
            if (state.events[block][staker].conf >= CONF_THRESHOLD) {
                // This vote was the final confirmation
                switch (state.balances.hasOwnProperty(staker)) {
                    case true: {
                        if (type === "add") {
                            state.balances[staker] += amount;
                        }
                        else if (type === "remove") {
                            state.balances[staker] -= amount;
                        }
                        delete state.events[block][staker];
                        if (Object.keys(state.events[block]).length === 0) {
                            delete state.events[block];
                        }
                        break;
                    }
                    case false: {
                        if (type !== "add") {
                            Logger_1.Logger.consensusWarn("(6) Potential consensus failure.");
                        }
                        state.balances[staker] = amount;
                        delete state.events[block][staker];
                        if (Object.keys(state.events[block]).length === 0) {
                            delete state.events[block];
                        }
                        break;
                    }
                    default: {
                        break;
                    }
                }
                Logger_1.Logger.consensus("(7) Stake event confirmed, balances updated.");
                return Vote_1.Vote.valid();
            }
            else {
                Logger_1.Logger.consensus("(8) Witness transaction approved for pending event.");
                return Vote_1.Vote.valid();
            }
            // REMOVE ABOVE BLOCK BEFORE DEPLOYING
            Logger_1.Logger.consensus("Witness transaction approved for new event.");
            return Vote_1.Vote.valid();
        }
    }
    else {
        // Invalid event
        Logger_1.Logger.consensusWarn("(9) Invalid witness event rejected.");
        return Vote_1.Vote.invalid("Invalid witness event rejected.");
    }
}
exports.deliverStake = deliverStake;
function isValidStakeEvent(data) {
    // TODO: add info about proposer to validation condition
    if (!(data.hasOwnProperty("staker") &&
        data.hasOwnProperty("type") &&
        data.hasOwnProperty("block") &&
        data.hasOwnProperty("amount") &&
        Object.keys(data).length === 4)) {
        return false;
    }
    else if (typeof (data.staker) !== 'string' ||
        typeof (data.type) !== 'string' ||
        typeof (data.block) !== 'number' ||
        typeof (data.amount) !== 'number') {
        return false;
    }
    else {
        return true;
    }
}
