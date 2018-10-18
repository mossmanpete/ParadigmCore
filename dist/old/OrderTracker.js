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
    flush() {
        this.orders = [];
    }
    constructor(emitter) {
        this.em = emitter;
        this.orders = [];
    }
    add(order) {
        this.orders.push(order);
    }
    triggerBroadcast() {
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
