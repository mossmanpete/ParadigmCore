"use strict";
/**
  =========================
  ParadigmCore: Blind Star
  orderHandlers.ts @ {master}
  =========================

  @date_initial 23 October 2018
  @date_modified 29 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI OrderBroadcast transactions.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const Paradigm = require("paradigm-connect");
const messages_1 = require("../../util/static/messages");
const Logger_1 = require("../../util/Logger");
const Vote_1 = require("../Vote");
const Hasher_1 = require("../../crypto/Hasher");
// Order constructor from paradigm-connect
let Order = new Paradigm().Order;
/**
 * @name checkOrder() {export function} use to perform light verification of
 * OrderBroadcast transactions before accepting to mempool.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function checkOrder(tx, state) {
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature
    try {
        order = new Order(tx.data);
        poster = order.recoverPoster().toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.format);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
    }
    if (state.limits.hasOwnProperty(poster)) {
        Logger_1.Logger.mempool(messages_1.messages.abci.messages.mempool);
        return Vote_1.Vote.valid(messages_1.messages.abci.messages.mempool);
    }
    else {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.messages.noStake);
        return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
    }
}
exports.checkOrder = checkOrder;
/**
 * @name deliverOrder() {export function} execute an OrderBroadcast transaction
 * in full, and perform state modification.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 * @param q {OrderTracker} valid order queue
 */
function deliverOrder(tx, state, q) {
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature
    try {
        // Construct Paradigm order object
        order = new Order(tx.data);
        // Recover poster's signature, if valid
        poster = order.recoverPoster().toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.consensusWarn(messages_1.messages.abci.errors.format);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
    }
    if (state.limits.hasOwnProperty(poster) &&
        state.limits[poster].orderLimit > 0) {
        // This block executed if poster has valid stake 
        let orderCopy = order.toJSON();
        orderCopy.id = Hasher_1.Hasher.hashOrder(order);
        // Begin state modification
        state.limits[poster].orderLimit -= 1;
        state.orderCounter += 1;
        // End state modification
        // Access remaining quota 
        let remaining = state.limits[poster].orderLimit;
        // Add order to broadcast queue
        q.add(orderCopy);
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.verified);
        return Vote_1.Vote.valid(`Remaining quota: ${remaining}`, orderCopy.id);
    }
    else {
        // Executed if poster has no stake
        Logger_1.Logger.consensusWarn(messages_1.messages.abci.messages.noStake);
        return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
    }
}
exports.deliverOrder = deliverOrder;
