/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name stream.ts
 * @module abci/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 01-November-2018
 *
 * Handler functions for verifying ABCI Stream transactions, originating
 * from external API calls. Implements state transition logic as specified
 * in the spec for this TX type.
 */

import * as Paradigm from "paradigm-connect";

import { OrderTracker } from "../../async/OrderTracker";
import { Logger } from "../../util/Logger";
import { messages as msg } from "../../util/static/messages";
import { Vote } from "../Vote";

const Order = new Paradigm().Order; // Paradigm order constructor

/**
 * Used to perform mempool verification of StreamBroadcast transactions.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkStream(tx: object, state: any) {
    let order; // Paradigm order object
    let poster; // Recovered poster address from signature

    try {
        order = new Order(tx);
        poster = order.recoverPoster().toLowerCase();
    } catch (err) {
        Logger.mempoolWarn(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
    }

    if (state.mappings.limits.hasOwnProperty(poster)) {
        Logger.mempool(msg.abci.messages.mempool);
        return Vote.valid(msg.abci.messages.mempool);
    } else {
        Logger.mempoolWarn(msg.abci.messages.noStake);
        return Vote.invalid(msg.abci.messages.noStake);
    }
}

/**
 * Execute StreamBroadcast transactions in full, and perform state
 * modification.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
export function deliverStream(tx: object, state: object, tracker: OrderTracker) {
    return 0;
}
