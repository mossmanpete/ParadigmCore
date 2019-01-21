/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Hasher.ts
 * @module src/crypto
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  19-August-2018
 * @date (modified) 18-December-2018
 *
 * Hashing class to allow creation of state hashes. Also used to generate
 * ID's (orderID) for valid orders.
 *
 * @todo create better method of hashing state/orders
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
  public static hashOrder(order: Order): string {
    let orderHash: string;
    const hashPrep: object = {
      makerValues: order.makerValues,
      posterSignature: order.posterSignature,
      subContract: order.subContract,
    };

    try {
      orderHash = hash(hashPrep);
    } catch (error) {
      throw new Error(`failed generating order hash: ${error.message}`);
    }

    // return computed hash
    return orderHash;
  }

  /**
   * Generate a hash of the state.
   *
   * @param state {State} the current state object
   */
  public static hashState(state: State): string {
    let stateHash: string;
    const hashPrep: object = {
      posters: JSON.stringify(state.posters, bigIntReplacer),
      endHeight: state.round.endsAt,
      events: JSON.stringify(state.events, bigIntReplacer),
      lastHeight: parseInt(state.lastBlockHeight.toString(), 10),
      ordernum: parseInt(state.orderCounter.toString(), 10),
      roundNumber: state.round.number,
      startHeight: state.round.startsAt,
      lastHash: state.lastBlockAppHash
    };

    try {
      stateHash = hash(hashPrep);
    } catch (error) {
      throw new Error(`failed generating state hash: ${error.message}`);
    }

    // return computed hash
    return stateHash;
  }
}
