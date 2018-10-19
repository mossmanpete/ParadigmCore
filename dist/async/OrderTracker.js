"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  OrderTracker.ts @ {rebalance-refactor}
  =========================

  @date_inital 9 October 2018
  @date_modified 16 October 2018
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
    }
    activate() {
        this.activated = true;
        return this.activated;
    }
    add(order) {
        this.orders.push(order);
    }
    triggerBroadcast() {
        if (!this.activated)
            return; // do not broadcast if not in sync
        if (this.orders.length > 0) {
            try {
                this.orders.forEach(order => {
                    this.em.emit("order", order); // picked up by websocket server
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
}
exports.OrderTracker = OrderTracker;
