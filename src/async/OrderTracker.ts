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

import { EventEmitter } from "events";

export class OrderTracker {
    
    private em: EventEmitter; // event emiter instance
    private orders: Array<object>; // stores valid orders

    private activated: boolean = false;

    private flush() {
        this.orders = [];
    }

    constructor(emitter: EventEmitter) {
        this.em = emitter;
        this.orders = [];
    }

    public activate(): boolean {
        this.activated = true;
        return this.activated;
    }

    public add(order: object){
        this.orders.push(order);
    }

    public triggerBroadcast() {
        if(!this.activated) return; // do not broadcast if not in sync

        if(this.orders.length > 0){
            try {
                this.orders.forEach(order => {
                    this.em.emit("order", order) // picked up by websocket server
                });
                this.flush();
            } catch (err) {
                throw new Error("Error triggering event broadcast.");
            }

        } else {
            return;
        }
    }
}