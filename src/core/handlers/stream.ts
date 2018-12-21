/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name stream.ts
 * @module src/core/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 21-December-2018
 *
 * Handler functions for verifying ABCI Stream transactions, originating
 * from external API calls. Implements state transition logic as specified
 * in the spec for this TX type.
 *
 * NOT IMPLEMENTED YET!
 */

// ParadigmConnect contains Order class and methods
import * as Paradigm from "paradigm-connect";

// ParadigmCore classes
import { OrderTracker } from "../../async/OrderTracker";
import { Vote } from "../util/Vote";

/**
 * Used to perform mempool verification of StreamBroadcast transactions.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkStream(tx: SignedStreamTx, state: State) {
    return Vote.invalid();
}

/**
 * Execute StreamBroadcast transactions in full, and perform state
 * modification.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function deliverStream(tx: SignedStreamTx, state: State, tracker: OrderTracker) {
    return Vote.invalid();
}
