"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  orderHandlers.ts @ {dev}
  =========================

  @date_inital 23 October 2018
  @date_modified 23 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI OrderBroadcast transactions.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const Paradigm = require("paradigm-connect");
const messages_1 = require("../util/messages");
const Logger_1 = require("../util/Logger");
const Vote_1 = require("../util/Vote");
const Hasher_1 = require("../crypto/Hasher");
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
exports.checkOrder = checkOrder;
/**
 * @name deliverOrder() {export function} execute an OrderBroadcast
 * transaction in full, and perform state modification.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function deliverOrder(tx, state, tracker) {
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature
    try {
        // Construct Paradigm order object
        order = new Order(tx);
        // Recover poster's signature, if valid
        poster = order.recoverPoster().toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.consensusWarn(messages_1.messages.abci.errors.format);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
    }
    if (state.mappings.limits.hasOwnProperty(poster) &&
        state.mappings.limits[poster].orderBroadcastLimit > 0) {
        // This block executed if poster has valid stake 
        let orderCopy = order.toJSON();
        orderCopy.id = Hasher_1.Hasher.hashOrder(order);
        // Begin state modification
        state.mappings.limits[poster].orderBroadcastLimit -= 1;
        state.orderCounter += 1;
        // End state modification
        // Access remaining quota 
        let remaining = state.mappings.limits[poster].orderBroadcastLimit;
        // Add order to broadcast queue
        tracker.add(orderCopy);
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
