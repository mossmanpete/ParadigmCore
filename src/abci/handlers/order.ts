/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name order.ts
 * @module src/abci/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 04-December-2018
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
import { Vote } from "../util/Vote";

// ParadigmCore utilities
import { messages as msg } from "../../util/static/messages";
import { verifyOrder } from "../util/utils";

// Order constructor using ParadigmConnect Order object
const Order = new Paradigm().Order;

/**
 * Performs light verification of OrderBroadcast transactions before accepting
 * to local mempool.
 *
 * @param tx    {SignedOrderTx} decoded transaction body
 * @param state {State}         current round state
 */
export function checkOrder(tx: SignedOrderTx, state: State) {
    let order: Order;   // Paradigm order object
    let poster: string; // Recovered poster address from signature

    // Construct and verify order object, and recover poster signature
    try {
        // Construct order object
        order = new Order(tx.data);

        // Verify order size
        // @TODO: get max size from state
        if (!verifyOrder(order)) {
            Logger.mempoolWarn("Rejected order over maximum size.");
            return Vote.invalid("Order exceeds maximum size.");
        }

        // Recover poster address
        poster = order.recoverPoster().toLowerCase();
    } catch (err) {
        // Unknown staker
        Logger.mempoolWarn(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
    }

    // Does poster have a staked balance?
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
 * @param tx    {SignedOrderTx} decoded transaction body
 * @param state {State}         current round state
 * @param q     {OrderTracker}  valid order queue
 */
export function deliverOrder(tx: SignedOrderTx, state: State, q: OrderTracker) {
    let order: Order;   // Paradigm order object
    let poster: string; // Recovered poster address from signature

    // Construct order object, and recover poster signature
    try {
        order = new Order(tx.data);
        poster = order.recoverPoster().toLowerCase();
    } catch (err) {
        Logger.consensusWarn(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
    }

    // Verify poster balance and modify state
    if (
        state.limits.hasOwnProperty(poster) &&
        state.limits[poster].orderLimit > 0
    ) {
        // Hash order to generate orderID
        const orderCopy = order.toJSON();
        orderCopy.id = Hasher.hashOrder(order);

        // Begin state modification
        state.limits[poster].orderLimit -= 1;
        state.orderCounter += 1;
        // End state modification

        // Add order to block's broadcast queue
        q.add(orderCopy);

        Logger.consensus(msg.abci.messages.verified);
        return Vote.valid(`(confirmed) OrderID: ${orderCopy.id}`);
    } else {
        // No stake or insufficient quota remaining
        Logger.consensusWarn(msg.abci.messages.noStake);
        return Vote.invalid(msg.abci.messages.noStake);
    }
}
