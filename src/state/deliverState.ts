/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name commitState.ts
 * @module src/state
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  22-October-2018
 * @date (modified) 14-November-2018
 *
 * Object representing the initial and pre-commit state of the network.
 */

export let deliverState: State = {
  round: {
    number: 0,
    startsAt: 0,
    endsAt: 0,
    limit: 0
  },
  events: {},
  balances: {},
  limits: {},
  lastEvent: {
    add: 0,
    remove: 0
  },
  validators: {},
  orderCounter: 0,
  lastBlockHeight: 0,
  lastBlockAppHash: null
};
