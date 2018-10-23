"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  rebalanceHandlers.ts @ {dev}
  =========================

  @date_inital 23 October 2018
  @date_modified 23 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI Rebalance transactions.
*/
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @name checkRebalance() {export function} verify a Rebalance proposal before
 * accepting it into the local mempool.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function checkRebalance(tx, state) {
    return 0;
}
exports.checkRebalance = checkRebalance;
/**
 * @name deliverRebalance() {export function} execute a Rebalance transaction
 * and adopt the new mapping in state.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function deliverRebalance(tx, state) {
    return 0;
}
exports.deliverRebalance = deliverRebalance;
