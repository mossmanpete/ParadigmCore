"use strict";
/**
  =========================
  ParadigmCore: Blind Star
  streamHandlers.ts @ {dev}
  ~/src/abci/*
  =========================

  @date_inital 23 October 2018
  @date_modified 23 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI StreamBroadcasts.
*/
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @name checkStream() {export function} use to perform mempool verification of
 * StreamBroadcast transactions.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function checkStream(tx, state) {
    return 0;
}
exports.checkStream = checkStream;
/**
 * @name deliverStream() {export function} execute StreamBroadcast transactions
 * in full, and perform state modification.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
function deliverStream(tx, state) {
    return 0;
}
exports.deliverStream = deliverStream;
