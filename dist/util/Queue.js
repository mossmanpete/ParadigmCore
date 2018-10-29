"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Queue {
    constructor() {
        this.items = [];
        return;
    }
    add(item) {
        this.items.push(item);
        return;
    }
    remove() {
        if (this.isEmpty())
            throw new Error("Underflow");
        return this.items.shift();
    }
    front() {
        if (this.isEmpty())
            throw new Error("Underflow");
        return this.items[0];
    }
    /**
     * Returns a string of all items.
     */
    allItems() {
        return JSON.stringify(this.items);
    }
    isEmpty() {
        return this.items.length == 0;
    }
}
exports.Queue = Queue;
console.log("Testing.");
let queue = new Queue();
console.log("Adding items to queue.");
queue.add(1);
queue.add(2);
queue.add(3);
console.log("Printing queue.");
console.log(queue.allItems());
console.log("Calling remove.");
console.log(queue.remove());
console.log("Printing queue.");
console.log(queue.allItems());
