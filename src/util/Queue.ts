/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Queue.ts
 * @module src/util
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  28-October-2018
 * @date (modified) 02-November-2018
 *
 * Generalized queue implementation. Currently used in Broadcaster class.
 */

export class Queue extends Array {

    // Inherit properties of Array
    constructor() {
        if (arguments.length) {throw Error("constructor accepts no arguments"); }
        super();
    }

    /**
     * Add an item to the queue.
     *
     * @param item  {any}   the item to add to the queue.
     */
    public add(item: any): void { this.push(item); return; }

    /**
     * Removes and returns the first item from the queue.
     *
     * returns <T>
     */
    public remove() { if (this.isEmpty()) { return; } return this.shift(); }

    /**
     * Returns the first item in the queue.
     *
     * @returns <T>
     */
    public front() { if (this.isEmpty()) { return null; } return this[0]; }

    /**
     * Returns a string of all items.
     *
     * @returns string
     */
    public allItems() { return JSON.stringify(this); }

    /**
     * Returns true if queue is empty.
     *
     * @returns boolean
     */
    public isEmpty() { return this.length === 0; }
}
