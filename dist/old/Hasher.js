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
class Hasher {
    static hashOrder(order) {
        let hashPrep = {
            "subContract": order.subContract,
            "posterSignature": order.posterSignature,
            "makerValues": order.makerValues
        };
        try {
            let hashedOrder = hash(hashPrep);
            return hashedOrder;
        }
        catch (error) {
            throw new Error("Error hashing order.");
        }
    }
}
exports.Hasher = Hasher;
