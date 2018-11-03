"use strict";
/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name order.ts
 * @module abci/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 01-November-2018
 *
 * Handler functions for verifying ABCI Order transactions, originating from
 * external API calls. Implements state transition logic as specified in the
 * spec for this TX type.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// ParadigmConnect protocol driver and library
const Paradigm = require("paradigm-connect");
const Hasher_1 = require("../../crypto/Hasher");
const Logger_1 = require("../../util/Logger");
const messages_1 = require("../../util/static/messages");
const Vote_1 = require("../Vote");
// Order constructor from paradigm-connect
const Order = new Paradigm().Order;
/**
 * Performs light verification of OrderBroadcast transactions before accepting
 * to local mempool.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
function checkOrder(tx, state) {
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature
    try {
        // Construct order object, and recover poster signature
        order = new Order(tx.data);
        poster = order.recoverPoster().toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.format);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
    }
    if (state.limits.hasOwnProperty(poster) &&
        state.limits[poster].orderLimit > 0) {
        Logger_1.Logger.mempool(messages_1.messages.abci.messages.mempool);
        return Vote_1.Vote.valid(`(unconfirmed) OrderID: ${Hasher_1.Hasher.hashOrder(order)}`);
    }
    else {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.messages.noStake);
        return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
    }
}
exports.checkOrder = checkOrder;
/**
 * Execute an OrderBroadcast transaction in full, and perform state
 * modification.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 * @param q     {OrderTracker} valid order queue
 */
function deliverOrder(tx, state, q) {
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature
    try {
        // Construct order object, and recover poster signature
        order = new Order(tx.data);
        poster = order.recoverPoster().toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.consensusWarn(messages_1.messages.abci.errors.format);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
    }
    if (state.limits.hasOwnProperty(poster) &&
        state.limits[poster].orderLimit > 0) {
        // This block executed if poster has valid stake
        const orderCopy = order.toJSON();
        orderCopy.id = Hasher_1.Hasher.hashOrder(order);
        // Begin state modification
        state.limits[poster].orderLimit -= 1;
        state.orderCounter += 1;
        // End state modification
        // Access remaining quota
        // let remaining = state.limits[poster].orderLimit;
        // Add order to broadcast queue
        q.add(orderCopy);
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.verified);
        return Vote_1.Vote.valid(`(confirmed) OrderID: ${orderCopy.id}`);
    }
    else {
        // Executed if poster has no stake
        Logger_1.Logger.consensusWarn(messages_1.messages.abci.messages.noStake);
        return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
    }
}
exports.deliverOrder = deliverOrder;
