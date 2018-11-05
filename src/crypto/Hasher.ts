/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Hasher.ts
 * @module crypto
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  19-August-2018
 * @date (modified) 02-November-2018
 *
 * Hashing class to allow creation of state hashes. Also used to generate
 * ID's (orderID) for valid orders.
 */

import * as hash from "object-hash";
import { Logger } from "../util/Logger";

export class Hasher {

  /**
   * Generate the hash of an order to be used as the OrderID.
   *
   * @param order {paradigm.Order} A Paradigm order object to be hashed
   */
  public static hashOrder(order: any): string {
    // TODO: change to @type: paradigm.Order
    const hashPrep: object = {
      makerValues: order.makerValues,
      posterSignature: order.posterSignature,
      subContract: order.subContract,
    };

    try {
      const orderHash: string = hash(hashPrep);
      return orderHash;

    } catch (error) {
      throw new Error("Error generating order hash.");
    }
  }

  /**
   * Generate a hash of the state.
   *
   * @param state {State} the current state object
   */
  public static hashState(state: any): string {
    const hashPrep: object = {
      balances: JSON.stringify(state.balances),
      endHeight: state.round.endsAt,
      events: JSON.stringify(state.events),
      lastHeight: state.lastBlockHeight,
      limits: JSON.stringify(state.limits),
      ordernum: state.orderCounter,
      roundNumber: state.round.number,
      startHeight: state.round.startsAt,
    };

    try {
      const stateHash: string = hash(hashPrep);
      return stateHash;

    } catch (error) {
      throw new Error("Error generating state hash.");
    }
  }
}
