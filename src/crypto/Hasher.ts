/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Hasher.ts
 * @module src/crypto
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  19-August-2018
 * @date (modified) 04-December-2018
 *
 * Hashing class to allow creation of state hashes. Also used to generate
 * ID's (orderID) for valid orders.
 */

// Object hashing library (3rd party)
import * as hash from "object-hash";

// ParadigmCore utility
import { bigIntReplacer } from "../util/static/bigIntUtils";

export class Hasher {

  /**
   * Generate the hash of an order to be used as the OrderID.
   *
   * @param order {paradigm.Order} A Paradigm order object to be hashed
   */
  public static hashOrder(order: OrderData): string {
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
  public static hashState(state: State): string {
    const hashPrep: object = {
      balances: JSON.stringify(state.balances, bigIntReplacer),
      endHeight: state.round.endsAt,
      events: JSON.stringify(state.events, bigIntReplacer),
      lastHeight: state.lastBlockHeight,
      limits: JSON.stringify(state.limits),
      ordernum: state.orderCounter,
      roundNumber: state.round.number,
      startHeight: state.round.startsAt,
      lastHash: state.lastBlockAppHash
    };

    try {
      const stateHash: string = hash(hashPrep);
      return stateHash;

    } catch (error) {
      throw new Error("Error generating state hash.");
    }
  }
}
