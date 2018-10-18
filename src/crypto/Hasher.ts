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
import * as hash from "object-hash";

export class Hasher {
  public static hashOrder(order: any): string { // change to @type: paradigm.Order
    let hashPrep: object = {
      "subContract": order.subContract,
      "posterSignature": order.posterSignature,
      "makerValues": order.makerValues
    }

    try {
      let hashedOrder: string = hash(hashPrep);
      return hashedOrder
    } catch (error) {
      throw new Error("Error hashing order.");
    }
  }
}