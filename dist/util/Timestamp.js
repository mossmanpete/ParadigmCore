"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  Timestamp.ts @ {master}
  =========================
  
  @date_inital 10 October 2018
  @date_modified 27 October 2018
  @author Henry Harder

  Dumb class for creating a log timestamp.
*/
Object.defineProperty(exports, "__esModule", { value: true });
class Timestamp extends Date {
    constructor() {
        super();
    }
    logFormat() {
        return `${Math.floor(Date.now() / 1000).toString()}.${Date.now().toString().slice(-3)}`;
    }
}
exports.Timestamp = Timestamp;
