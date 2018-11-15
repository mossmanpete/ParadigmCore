/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name order.ts
 * @module src/abci/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 15-November-2018
 *
 * Handler functions for verifying ABCI Order transactions, originating from
 * external API calls. Implements state transition logic as specified in the
 * spec for this TX type.
 */

 // ParadigmConnect protocol driver and library
import * as Paradigm from "paradigm-connect";

// ParadigmCore classes
import { OrderTracker } from "../../async/OrderTracker";
import { Hasher } from "../../crypto/Hasher";
import { Logger } from "../../util/Logger";
import { messages as msg } from "../../util/static/messages";
import { Vote } from "../util/Vote";

// Order constructor from paradigm-connect
const Order = new Paradigm().Order;

/**
 * Performs light verification of OrderBroadcast transactions before accepting
 * to local mempool.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkOrder(tx: SignedOrderTx, state: State) {
    let order;  // Paradigm order object
    let poster; // Recovered poster address from signature

    try {
        // Construct order object, and recover poster signature
        order = new Order(tx.data);
        poster = order.recoverPoster().toLowerCase();
    } catch (err) {
        Logger.mempoolWarn(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
    }

    if (
        state.limits.hasOwnProperty(poster) &&
        state.limits[poster].orderLimit > 0
    ) {
        Logger.mempool(msg.abci.messages.mempool);
        return Vote.valid(`(unconfirmed) OrderID: ${Hasher.hashOrder(order)}`);
    } else {
        Logger.mempoolWarn(msg.abci.messages.noStake);
        return Vote.invalid(msg.abci.messages.noStake);
    }
}

/**
 * Execute an OrderBroadcast transaction in full, and perform state
 * modification.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 * @param q     {OrderTracker} valid order queue
 */
export function deliverOrder(tx: SignedOrderTx, state: State, q: OrderTracker) {
    let order;  // Paradigm order object
    let poster; // Recovered poster address from signature

    try {
        // Construct order object, and recover poster signature
        order = new Order(tx.data);
        poster = order.recoverPoster().toLowerCase();
    } catch (err) {
        Logger.consensusWarn(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
    }

    if (
        state.limits.hasOwnProperty(poster) &&
        state.limits[poster].orderLimit > 0
    ) {
        // This block executed if poster has valid stake
        const orderCopy = order.toJSON();
        orderCopy.id = Hasher.hashOrder(order);

        // Begin state modification
        state.limits[poster].orderLimit -= 1;
        state.orderCounter += 1;
        // End state modification

        // Add order to broadcast queue
        q.add(orderCopy);

        Logger.consensus(msg.abci.messages.verified);
        return Vote.valid(`(confirmed) OrderID: ${orderCopy.id}`);
    } else {
        // Executed if poster has no stake
        Logger.consensusWarn(msg.abci.messages.noStake);
        return Vote.invalid(msg.abci.messages.noStake);
    }
}
