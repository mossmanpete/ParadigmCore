/**
  =========================
  ParadigmCore: Blind Star
  orderHandlers.ts @ {master}
  =========================

  @date_initial 23 October 2018
  @date_modified 29 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI OrderBroadcast transactions. 
*/

import * as Paradigm from "paradigm-connect";

import { messages as msg } from "../../util/messages";
import { Logger } from "../../util/Logger";
import { Vote } from "../../util/Vote";
import { Hasher } from "../../crypto/Hasher";
import { OrderTracker } from "../../async/OrderTracker";

// Order constructor from paradigm-connect
let Order = new Paradigm().Order;

/**
 * @name checkOrder() {export function} use to perform light verification of
 * OrderBroadcast transactions before accepting to mempool.
 * 
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkOrder(tx: any, state: any){
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature

    try {
        order = new Order(tx.data);
        poster = order.recoverPoster().toLowerCase();
    } catch (err) {
        Logger.mempoolWarn(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
    }

    if(state.limits.hasOwnProperty(poster)){
        Logger.mempool(msg.abci.messages.mempool);
        return Vote.valid(msg.abci.messages.mempool);
    } else {
        Logger.mempoolWarn(msg.abci.messages.noStake);
        return Vote.invalid(msg.abci.messages.noStake);
    }
}

/**
 * @name deliverOrder() {export function} execute an OrderBroadcast transaction
 * in full, and perform state modification.
 * 
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 * @param q {OrderTracker} valid order queue
 */
export function deliverOrder(tx: any, state: any, q: OrderTracker){
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature

    try {
        // Construct Paradigm order object
        order = new Order(tx.data);

        // Recover poster's signature, if valid
        poster = order.recoverPoster().toLowerCase();
    } catch (err) {
        Logger.consensusWarn(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
    }

    if(
        state.limits.hasOwnProperty(poster) &&
        state.limits[poster].orderLimit > 0
    ){
        // This block executed if poster has valid stake 

        let orderCopy = order.toJSON();
        orderCopy.id = Hasher.hashOrder(order);

        // Begin state modification
        state.limits[poster].orderLimit -= 1;
        state.orderCounter += 1;
        // End state modification

        // Access remaining quota 
        let remaining = state.limits[poster].orderLimit;

        // Add order to broadcast queue
        q.add(orderCopy);

        Logger.consensus(msg.abci.messages.verified);
        return Vote.valid(`Remaining quota: ${remaining}`, orderCopy.id)
    } else {
        // Executed if poster has no stake

        Logger.consensusWarn(msg.abci.messages.noStake)
        return Vote.invalid(msg.abci.messages.noStake);
    }
}