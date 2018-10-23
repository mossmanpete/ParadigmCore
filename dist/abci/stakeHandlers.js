"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @name checkStake() {export function} use to perform mempool verification of
 * Ethereum StakeEvent transactions.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function checkStake(tx, state) {
    return 0;
}
exports.checkStake = checkStake;
/**
 * @name deliverStake() {export function} perform state modification of Stake
 * Event transactions (modify staker's balance).
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function deliverStake(tx, state) {
    return 0;
}
exports.deliverStake = deliverStake;
