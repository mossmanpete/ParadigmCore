/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name stream.ts
 * @module src/abci/handlers
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

// ParadigmConnect contains Order class and methods
import * as Paradigm from "paradigm-connect";

// ParadigmCore classes
import { OrderTracker } from "../../async/OrderTracker";
import { Logger } from "../../util/Logger";
import { messages as msg } from "../../util/static/messages";
import { Vote } from "../util/Vote";

// Paradigm order constructor
const Order = new Paradigm().Order;

/**
 * Used to perform mempool verification of StreamBroadcast transactions.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkStream(tx: SignedStreamTx, state: State) {
    return 0;
}

/**
 * Execute StreamBroadcast transactions in full, and perform state
 * modification.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function deliverStream(
    tx: SignedStreamTx,
    state: State,
    tracker: OrderTracker
) {
    return 0;
}
