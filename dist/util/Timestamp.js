"use strict";
/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Timestamp.ts
 * @module src/util
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  10-October-2018
 * @date (modified) 02-November-2018
 *
 * Dumb class for creating a log timestamp.
 *
 * @todo integrate this as a function, or somewhere else.
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
