/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name OrderTracker.ts
 * @module src/async
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  24-September-2018
 * @date (modified) 02-November-2018
 *
 * The OrderTracker class stores valid txs submitted within a consensus
 * round, and triggers public broadcast at the end of each round.
 */

import { EventEmitter } from "events";

export class OrderTracker {

    private ee: EventEmitter;           // Event emitter instance
    private txs: object[];              // Stores valid Txs
    private activated: boolean = false; // Events broadcast if true

    constructor(emitter: EventEmitter) {
        this.ee = emitter;
        this.txs = [];
    }

    /**
     * When `.activate` is called, the OrderTracker will emit events
     * at the end of each block. This is not desirable during sync mode, so
     * this method allows the tracker to be activated after the blockchain has
     * synced.
     */
    public activate(): boolean {
        this.activated = true;
        return this.activated;
    }

    /**
     * Add a broadcast transaction ("order" or "stream") to the queue.)
     */
    public add(tx: object) {
        this.txs.push(tx);
    }

    /**
     * Trigger an WebSocket broadcast (via the global Emitter constructed at
     * startup).
     */
    public triggerBroadcast() {
        if (!this.activated) { return; } // Do not broadcast if not in sync

        if (this.txs.length > 0) {
            try {
                // Trigger Tx broadcast
                this.txs.forEach((tx) => {
                    this.ee.emit("tx", tx); // Picked up by WebSocket server
                });

                this.flush(); // Reset tracker
            } catch (err) {
                throw new Error("Error triggering event broadcast.");
            }

        } else {
            return;
        }
    }

    /**
     * Clear the queue after each consensus round.
     */
    private flush() {
        this.txs = [];
    }
}
