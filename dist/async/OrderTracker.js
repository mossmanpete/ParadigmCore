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
 * The OrderTracker class stores valid orders submitted within a consensus
 * round, and triggers public broadcast at the end of each round.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class OrderTracker {
    constructor(emitter) {
        this.activated = false;
        this.em = emitter;
        this.orders = [];
        this.streams = [];
    }
    activate() {
        this.activated = true;
        return this.activated;
    }
    /**
     * @deprecated Use addOrder()
     */
    add(order) {
        this.orders.push(order);
    }
    addOrder(order) {
        this.orders.push(order);
    }
    addStream(stream) {
        this.streams.push(stream);
    }
    triggerBroadcast() {
        if (!this.activated) {
            return;
        } // do not broadcast if not in sync
        if (this.orders.length > 0 || this.streams.length > 0) {
            try {
                // Trigger order broadcast
                this.orders.forEach((order) => {
                    this.em.emit("order", order); // picked up by websocket server
                });
                // Trigger stream broadcast
                this.streams.forEach((stream) => {
                    this.em.emit("stream", stream); // picked up by websocket server
                });
                // Reset tracker
                this.flush();
            }
            catch (err) {
                throw new Error("Error triggering event broadcast.");
            }
        }
        else {
            return;
        }
    }
    flush() {
        this.orders = [];
        this.streams = [];
    }
}
exports.OrderTracker = OrderTracker;
