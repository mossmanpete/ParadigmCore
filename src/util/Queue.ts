export class Queue {
    private items: Array<any>;  // Queue items

    constructor(){
        this.items = [];
        return;
    }

    public add(item): void {
        this.items.push(item);
        return;
    }

    public remove(): any {
        if (this.isEmpty()) throw new Error("Underflow");
        return this.items.shift();
    }

    public front(): any {
        if(this.isEmpty()) throw new Error("Underflow");
        return this.items[0];
    }

    /**
     * Returns a string of all items.
     */
    public allItems(): string {
        return JSON.stringify(this.items);
    }

    private isEmpty(): boolean {
        return this.items.length == 0;
    }
}

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

