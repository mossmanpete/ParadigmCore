"use strict";
/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Queue.ts
 * @module util
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  28-October-2018
 * @date (modified) 02-November-2018
 *
 * Generalized queue implementation. Currently used in Broadcaster class.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class Queue {
    constructor() {
        this.items = [];
        return;
    }
    /**
     * Add an item to the queue.
     *
     * @param item  {any}   the item to add to the queue.
     */
    add(item) {
        this.items.push(item);
        return;
    }
    /**
     * Removes and returns the first item from the queue.
     */
    remove() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items.shift();
    }
    /**
     * Returns the first item in the queue.
     */
    front() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items[0];
    }
    /**
     * Returns a string of all items.
     */
    allItems() {
        return JSON.stringify(this.items);
    }
    /**
     * Returns true if queue is empty.
     */
    isEmpty() {
        return this.items.length === 0;
    }
}
exports.Queue = Queue;
