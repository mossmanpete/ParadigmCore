"use strict";
/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Vote.ts
 * @module abci
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  24-September-2018
 * @date (modified) 02-November-2018
 *
 * The Vote class represents a Tendermint ABCI response message.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class Vote {
    /*
        This class will be expanded with more errors for the
        different failure points in checkTx (and deliverTx).
    */
    static valid(message) {
        return {
            code: 0,
            log: message,
        };
    }
    static invalid(message) {
        return {
            code: 1,
            log: message,
        };
    }
}
exports.Vote = Vote;
