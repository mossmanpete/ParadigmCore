/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name commitState.ts
 * @module src/state
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  22-October-2018
 * @date (modified) 20-December-2018
 *
 * Object representing the post-commit state of the network.
 */

export let commitState: State = {
  round: {
    number: 0,
    startsAt: 0,
    endsAt: 0,
    limit: 0
  },
  events: {},
  posters: {},
  lastEvent: {
    add: 0,
    remove: 0
  },
  validators: {},
  consensusParams: {
    finalityThreshold: null,
    periodLength: null,
    periodLimit: null,
    maxOrderBytes: null,
    confirmationThreshold: null
  },
  orderCounter: 0n,
  lastBlockHeight: 0n,
  lastBlockAppHash: null
};
