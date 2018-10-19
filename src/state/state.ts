/*
  =========================
  ParadigmCore: Blind Star
  state.ts @ {master}
  =========================
  
  @date_inital 25 September 2018
  @date_modified 19 October 2018
  @author Henry Harder

  Object that represents the (initial) pre-commit state of the OS node.
*/

export let state = {
  round: {
    number: 0,
    startsAt: 0,
    endsAt: 0
  },
  mapping: {},
  orderCounter: 0
}
