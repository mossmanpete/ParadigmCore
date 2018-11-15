"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("../../util/Logger");
const Vote_1 = require("../util/Vote");
const { CONF_THRESHOLD, NODE_ENV } = process.env;
function checkWitness(tx, state) {
    if (isValidStakeEvent(tx.data, state)) {
        Logger_1.Logger.mempool("Stake witness transaction accepted.");
        return Vote_1.Vote.valid("Stake witnesss transaction accepted.");
    }
    else {
        Logger_1.Logger.mempoolWarn("Invalid witness event rejected.");
        return Vote_1.Vote.invalid("Invalid witness event rejected.");
    }
}
exports.checkWitness = checkWitness;
function deliverWitness(tx, state) {
    if (!(isValidStakeEvent(tx.data, state))) {
        Logger_1.Logger.consensusWarn("Invalid witness event rejected.");
        return Vote_1.Vote.invalid();
    }
    const staker = tx.data.staker;
    const type = tx.data.type;
    const block = tx.data.block;
    const amount = BigInt.fromString(tx.data.amount);
    switch (state.events.hasOwnProperty(block)) {
        case true: {
            if (state.events[block].hasOwnProperty(staker) &&
                state.events[block][staker].amount === amount &&
                state.events[block][staker].type === type) {
                state.events[block][staker].conf += 1;
                updateMappings(state, staker, block, amount, type);
                Logger_1.Logger.consensus("Voted for valid stake event (existing).");
                return Vote_1.Vote.valid();
            }
            else if (!(state.events[block].hasOwnProperty(staker))) {
                state.events[block][staker] = {
                    amount,
                    conf: 1,
                    type,
                };
                if (NODE_ENV === "development") {
                    updateMappings(state, staker, block, amount, type);
                }
                Logger_1.Logger.consensus("Voted for new valid stake event.");
                return Vote_1.Vote.valid();
            }
            else {
                Logger_1.Logger.consensusWarn("Event Tx does not match event in state.");
                return Vote_1.Vote.invalid();
            }
        }
        case false: {
            state.events[block] = {};
            state.events[block][staker] = {
                amount,
                conf: 1,
                type,
            };
            if (NODE_ENV === "development") {
                updateMappings(state, staker, block, amount, type);
            }
            Logger_1.Logger.consensus("Voted for valid stake event (new).");
            return Vote_1.Vote.valid();
        }
        default: {
            return Vote_1.Vote.invalid();
        }
    }
}
exports.deliverWitness = deliverWitness;
function isValidStakeEvent(data, state) {
    if (!(data.hasOwnProperty("staker") &&
        data.hasOwnProperty("type") &&
        data.hasOwnProperty("block") &&
        data.hasOwnProperty("amount") &&
        Object.keys(data).length === 4)) {
        return false;
    }
    else if (typeof (data.staker) !== "string" ||
        typeof (data.type) !== "string" ||
        typeof (data.block) !== "number" ||
        typeof (data.amount) !== "string") {
        return false;
    }
    else if (!(data.type === "add" || data.type === "remove")) {
        return false;
    }
    else if (data.block <= state.lastEvent[data.type]) {
        return false;
    }
    else {
        return true;
    }
}
function updateMappings(state, staker, block, amount, type) {
    if (state.events.hasOwnProperty(block) &&
        state.events[block].hasOwnProperty(staker) &&
        state.events[block][staker].type === type &&
        state.events[block][staker].amount === amount) {
        if (state.events[block][staker].conf >= parseInt(CONF_THRESHOLD, 10)) {
            Logger_1.Logger.consensus("Witness event confirmed. Updating balances.");
            switch (state.balances.hasOwnProperty(staker)) {
                case true: {
                    applyEvent(state, staker, amount, type);
                    break;
                }
                case false: {
                    state.balances[staker] = BigInt(0);
                    applyEvent(state, staker, amount, type);
                    break;
                }
                default: {
                    return;
                }
            }
            delete state.events[block][staker];
            if (Object.keys(state.events[block]).length === 0) {
                delete state.events[block];
            }
            if (state.balances[staker] === 0) {
                delete state.balances[staker];
            }
            if (state.lastEvent[type] < block) {
                state.lastEvent[type] = block;
            }
            return;
        }
        else {
            Logger_1.Logger.consensus("Confirmation added for pending witness event.");
            return;
        }
    }
    else {
        Logger_1.Logger.consensusWarn("Disagreement about event data. Potential failure.");
        return;
    }
}
function applyEvent(state, staker, amount, type) {
    switch (type) {
        case "add": {
            state.balances[staker] += amount;
            break;
        }
        case "remove": {
            state.balances[staker] -= amount;
            break;
        }
        default: {
            return;
        }
    }
    return;
}
