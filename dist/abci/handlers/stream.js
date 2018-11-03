"use strict";
/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name stream.ts
 * @module abci/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 01-November-2018
 *
 * Handler functions for verifying ABCI Stream transactions, originating
 * from external API calls. Implements state transition logic as specified
 * in the spec for this TX type.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Paradigm = require("paradigm-connect");
const Logger_1 = require("../../util/Logger");
const messages_1 = require("../../util/static/messages");
const Vote_1 = require("../Vote");
const Order = new Paradigm().Order; // Paradigm order constructor
/**
 * Used to perform mempool verification of StreamBroadcast transactions.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
function checkStream(tx, state) {
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature
    try {
        order = new Order(tx);
        poster = order.recoverPoster().toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.format);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
    }
    if (state.mappings.limits.hasOwnProperty(poster)) {
        Logger_1.Logger.mempool(messages_1.messages.abci.messages.mempool);
        return Vote_1.Vote.valid(messages_1.messages.abci.messages.mempool);
    }
    else {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.messages.noStake);
        return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
    }
}
exports.checkStream = checkStream;
/**
 * Execute StreamBroadcast transactions in full, and perform state
 * modification.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function deliverStream(tx, state, tracker) {
    return 0;
}
exports.deliverStream = deliverStream;
