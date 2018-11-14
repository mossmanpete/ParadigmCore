"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
class OrderTracker {
    constructor(emitter) {
        this.activated = false;
        if (typeof (emitter) === undefined || !(emitter instanceof events_1.EventEmitter)) {
            throw new Error("Must provide EventEmitter to constructor.");
        }
        this.ee = emitter;
        this.txs = [];
    }
    activate() {
        this.activated = true;
        return this.activated;
    }
    add(tx) {
        this.txs.push(tx);
    }
    triggerBroadcast() {
        if (!this.activated) {
            return;
        }
        if (this.txs.length > 0) {
            try {
                this.txs.forEach((tx) => {
                    this.ee.emit("tx", tx);
                });
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
        this.txs = [];
    }
}
exports.OrderTracker = OrderTracker;
