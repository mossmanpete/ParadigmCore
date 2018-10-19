"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
  =========================
  ParadigmCore: Blind Star
  Hasher.ts @ {rebalance-refactor}
  =========================

  @date_inital 19 August 2018
  @date_modified 24 September 2018
  @author Henry Harder

  Class for preparing and creating OrderID's via salted hash.
*/
const hash = require("object-hash");
const Logger_1 = require("../util/Logger");
class Hasher {
    /**
     * hashOrder (public static method) Generate the hash of an order to be used as
     * the OrderID.
     *
     * @param order {paradigm.Order} A Paradigm order object to be hashed
     */
    static hashOrder(order) {
        let hashPrep = {
            "subContract": order.subContract,
            "posterSignature": order.posterSignature,
            "makerValues": order.makerValues
        };
        try {
            let orderHash = hash(hashPrep);
            return orderHash;
        }
        catch (error) {
            throw new Error("Error generating order hash.");
        }
    }
    /**
     * hashState (public static method) Generate the hash of the state.
     *
     * @param state {State} the current state object
     */
    static hashState(state) {
        let hashPrep = {
            "roundNumber": state.round.number,
            "startHeight": state.round.startsAt,
            "endHeight": state.round.endsAt,
            "rateMapping": state.mapping
        };
        try {
            let stateHash = hash(hashPrep);
            return stateHash;
        }
        catch (error) {
            Logger_1.Logger.logError("(Temporary log) Error generating state hash.");
            throw new Error("Error generating state hash.");
        }
    }
}
exports.Hasher = Hasher;
