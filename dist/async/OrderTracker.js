"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class OrderTracker {
    constructor(emitter) {
        this.activated = false;
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
