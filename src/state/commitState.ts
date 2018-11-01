/*
  =========================
  ParadigmCore: Blind Star
  commitState.ts @ {master}
  =========================
  
  @date_initial 22 October 2018
  @date_modified 1 November 2018
  @author Henry Harder

  Object that represents the post-commit state of the OS node.
*/

export let commitState = {
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
  orderCounter: 0,
  lastBlockHeight: 0,
  lastBlockAppHash: null
}
