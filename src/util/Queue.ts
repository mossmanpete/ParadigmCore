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

export class Queue {
    private items: any[];  // Queue items

    constructor() {
        this.items = [];
        return;
    }

    /**
     * Add an item to the queue.
     *
     * @param item  {any}   the item to add to the queue.
     */
    public add(item: any): void {
        this.items.push(item);
        return;
    }

    /**
     * Removes and returns the first item from the queue.
     */
    public remove(): any {
        if (this.isEmpty()) { return null; }
        return this.items.shift();
    }

    /**
     * Returns the first item in the queue.
     */
    public front(): any {
        if (this.isEmpty()) { return null; }
        return this.items[0];
    }

    /**
     * Returns a string of all items.
     */
    public allItems(): string {
        return JSON.stringify(this.items);
    }

    /**
     * Returns true if queue is empty.
     */
    public isEmpty(): boolean {
        return this.items.length === 0;
    }
}
