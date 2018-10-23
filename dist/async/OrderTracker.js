"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  OrderTracker.ts @ {master}
  =========================

  @date_inital 9 October 2018
  @date_modified 19 October 2018
  @author Henry Harder
  
  Class to store valid orders and trigger broadcast upon consensus round completion.
*/
Object.defineProperty(exports, "__esModule", { value: true });
class OrderTracker {
    constructor(emitter) {
        this.activated = false;
        this.em = emitter;
        this.orders = [];
    }
    flush() {
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
        if (!this.activated)
            return; // do not broadcast if not in sync
        if (this.orders.length > 0 || this.streams.length > 0) {
            try {
                // Trigger order broadcast
                this.orders.forEach(order => {
                    this.em.emit("order", order); // picked up by websocket server
                });
                // Trigger stream broadcast
                this.streams.forEach(stream => {
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
}
exports.OrderTracker = OrderTracker;
