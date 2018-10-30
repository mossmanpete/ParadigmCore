/*
  =========================
  ParadigmCore: Blind Star
  Hasher.ts @ {master}
  =========================

  @date_initial 19 August 2018
  @date_modified 19 October 2018
  @author Henry Harder

  Class for preparing and creating OrderID's via salted hash.
*/
import * as hash from "object-hash";
import { Logger } from "../util/Logger";

export class Hasher {

  /**
   * hashOrder (public static method) Generate the hash of an order to be used as 
   * the OrderID.
   * 
   * @param order {paradigm.Order} A Paradigm order object to be hashed
   */
  public static hashOrder(order: any): string { // TODO: change to @type: paradigm.Order
    let hashPrep: object = {
      "subContract": order.subContract,
      "posterSignature": order.posterSignature,
      "makerValues": order.makerValues
    }

    try {
      let orderHash: string = hash(hashPrep);
      return orderHash;

    } catch (error) {
      throw new Error("Error generating order hash.");
    }
  }

  /**
   * hashState (public static method) Generate the hash of the state.
   * 
   * @param state {State} the current state object
   */
  public static hashState(state: any): string {
    let hashPrep: object = {
      "roundNumber": state.round.number,
      "startHeight": state.round.startsAt,
      "endHeight": state.round.endsAt,
      "balances": state.balances,
      "ordernum": state.orderCounter,
      "events": state.events,
      "limits": state.limits,
      "lastHeight": state.lastBlockHeight
    }

    try {
      let stateHash: string = hash(hashPrep);
      return stateHash;

    } catch (error) {
      Logger.logError("(Temporary log) Error generating state hash.")
      throw new Error("Error generating state hash.");
    }
  }
}