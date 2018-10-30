"use strict";
/**
  =========================
  ParadigmCore: Blind Star
  streamHandlers.ts @ {master}
  =========================

  @date_initial 23 October 2018
  @date_modified 29 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI StreamBroadcasts.

  @10-23 We need paradigm-connect to allow the creation of a custom order type
*/
Object.defineProperty(exports, "__esModule", { value: true });
const Paradigm = require("paradigm-connect");
const messages_1 = require("../../util/messages");
const Logger_1 = require("../../util/Logger");
const Vote_1 = require("../../util/Vote");
let Order = new Paradigm().Order; // Paradigm order constructor
/**
 * @name checkStream() {export function} use to perform mempool verification of
 * StreamBroadcast transactions.
 *
 * @param tx {object} decoded transaction body
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
 * @name deliverStream() {export function} execute StreamBroadcast transactions
 * in full, and perform state modification.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function deliverStream(tx, state, tracker) {
    return 0;
}
exports.deliverStream = deliverStream;
