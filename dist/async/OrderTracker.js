"use strict";
/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name OrderTracker.ts
 * @module async
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  24-September-2018
 * @date (modified) 02-November-2018
 *
 * The OrderTracker class stores valid txs submitted within a consensus
 * round, and triggers public broadcast at the end of each round.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class OrderTracker {
    constructor(emitter) {
        this.activated = false; // Events broadcast if true
        this.ee = emitter;
        this.txs = [];
    }
    /**
     * When `.activate` is called, the OrderTracker will emit events
     * at the end of each block. This is not desirable during sync mode, so
     * this method allows the tracker to be activated after the blockchain has
     * synced.
     */
    activate() {
        this.activated = true;
        return this.activated;
    }
    /**
     * Add a broadcast transaction ("order" or "stream") to the queue.)
     */
    add(tx) {
        this.txs.push(tx);
    }
    /**
     * Trigger an WebSocket broadcast (via the global Emitter constructed at
     * startup).
     */
    triggerBroadcast() {
        if (!this.activated) {
            return;
        } // Do not broadcast if not in sync
        if (this.txs.length > 0) {
            try {
                // Trigger Tx broadcast
                this.txs.forEach((tx) => {
                    this.ee.emit("tx", tx); // Picked up by WebSocket server
                });
                this.flush(); // Reset tracker
            }
            catch (err) {
                throw new Error("Error triggering event broadcast.");
            }
        }
        else {
            return;
        }
    }
    /**
     * Clear the queue after each consensus round.
     */
    flush() {
        this.txs = [];
    }
}
exports.OrderTracker = OrderTracker;
