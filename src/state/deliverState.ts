/*
  =========================
  ParadigmCore: Blind Star
  deliverState.ts @ {master}
  =========================
  
  @date_inital 25 September 2018
  @date_modified 19 October 2018
  @author Henry Harder

  Object that represents the initial and pre-commit state of the OS node.
*/

export let deliverState = {
  round: {
    number: 0,
    startsAt: 0,
    endsAt: 0
  },
  mapping: {},
  orderCounter: 0,
  lastBlockHeight: 0
}
