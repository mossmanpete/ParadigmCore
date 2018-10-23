"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  commitState.ts @ {master}
  =========================
  
  @date_inital 22 October 2018
  @date_modified 19 October 2018
  @author Henry Harder

  Object that represents the post-commit state of the OS node.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitState = {
    round: {
        number: 0,
        startsAt: 0,
        endsAt: 0
    },
    mapping: {},
    orderCounter: 0,
    lastBlockHeight: 0
};
