/**  
  =========================
  ParadigmCore: Blind Star
  streamHandlers.ts @ {master}
  =========================

  @date_initial 23 October 2018
  @date_modified 29 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI StreamBroadcasts. 

  @10-23 We need paradigm-connect to allow the creation of a custom order type
*/

import * as Paradigm from "paradigm-connect";

import { messages as msg } from "../../util/static/messages";
import { OrderTracker } from "../../async/OrderTracker";
import { Logger } from "../../util/Logger";
import { Vote } from "../Vote";

let Order = new Paradigm().Order; // Paradigm order constructor

/**
 * @name checkStream() {export function} use to perform mempool verification of
 * StreamBroadcast transactions.
 * 
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkStream(tx: object, state: any){
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature

    try {
        order = new Order(tx);
        poster = order.recoverPoster().toLowerCase();
    } catch (err) {
        Logger.mempoolWarn(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
    }

    if(state.mappings.limits.hasOwnProperty(poster)){
        Logger.mempool(msg.abci.messages.mempool);
        return Vote.valid(msg.abci.messages.mempool);
    } else {
        Logger.mempoolWarn(msg.abci.messages.noStake);
        return Vote.invalid(msg.abci.messages.noStake);
    }
}

/**
 * @name deliverStream() {export function} execute StreamBroadcast transactions
 * in full, and perform state modification. 
 * 
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
export function deliverStream(tx: object, state: object, tracker: OrderTracker){
    return 0;
}