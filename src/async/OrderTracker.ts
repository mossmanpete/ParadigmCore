/*
  =========================
  ParadigmCore: Blind Star
  OrderTracker.ts @ {master}
  =========================

  @date_initial 9 October 2018
  @date_modified 24 October 2018
  @author Henry Harder
  
  Class to store valid orders and trigger broadcast upon consensus round completion.
*/

import { EventEmitter } from "events";

export class OrderTracker {
    
    private em: EventEmitter; // event emitter instance
    private orders: Array<object>; // stores valid orders
    private streams: Array<object>; // stores valid streams

    private activated: boolean = false;

    private flush() {
        this.orders = [];
        this.streams = [];
    }

    constructor(emitter: EventEmitter) {
        this.em = emitter;
        this.orders = [];
        this.streams = [];
    }

    public activate(): boolean {
        this.activated = true;
        return this.activated;
    }

    /**
     * @deprecated Use addOrder()
     */
    public add(order: object){
        this.orders.push(order);
    }

    public addOrder(order: object){
        this.orders.push(order);
    }

    public addStream(stream: object){
        this.streams.push(stream);
    }

    public triggerBroadcast() {
        if(!this.activated) return; // do not broadcast if not in sync

        if(this.orders.length > 0 || this.streams.length > 0){
            try {
                // Trigger order broadcast
                this.orders.forEach(order => {
                    this.em.emit("order", order) // picked up by websocket server
                });

                // Trigger stream broadcast
                this.streams.forEach(stream => {
                    this.em.emit("stream", stream) // picked up by websocket server
                });

                // Reset tracker
                this.flush();
            } catch (err) {
                throw new Error("Error triggering event broadcast.");
            }

        } else {
            return;
        }
    }
}