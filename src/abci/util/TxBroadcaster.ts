/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name TxBroadcaster.ts
 * @module src/abci
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  15-October-2018
 * @date (modified) 18-December-2018
 *
 * This class is responsible for executing local ABCI transactions. It
 * implements a queue, and allows multiple "concurrent" usage of a given
 * instance for local ABCI txs, so only one instance should be used per node.
 */

// 3rd party and STDLIB imports
import { EventEmitter } from "events";

// ParadigmCore classes
import { PayloadCipher } from "../../crypto/PayloadCipher";
import { err, log, warn } from "../../util/log";

export class TxBroadcaster {
    private client: any;            // Tendermint RPC client
    private queue: any[][];         // Pending transaction queue
    private tracker: EventEmitter;  // Enables async order broadcast

    private started: boolean;       // Transactions will be sent only if true
    private broadcasting: boolean;  // True while sending txs

    /**
     * Create a new TxBroadcaster instance.
     *
     * @param options       {object}    Options object with:
     *  - options.client    {RpcClient} Tendermint ABCI client
     */
    constructor(options: any) {
        // tslint:disable-next-line:variable-name
        const _this = this;   // Store 'this' reference

        // Instance properties
        this.client = options.client;       // RPC client
        this.tracker = new EventEmitter();  // Order tracker
        this.queue = [];

        // Attach error handlers to client
        this.client.on("error", (error) => {
            err("tx", `in tendermint abci connection: ${error}`);
            throw new Error("error encountered in tendermint connection");
        });
        this.client.on("close", (error) => {
            err("tx", `connection to abci server closed: ${error}`);
            throw new Error("tendermint connection terminated unexpectedly");
        });

        // Attach handlers to tx tracker
        this.tracker.on("tx", () => {
            // We only need to start broadcasting if we aren't already
            if (!(_this.broadcasting)) { _this.broadcast(); }
        });

        // Set initial status
        this.broadcasting = false;
        this.started = false;
        return;
    }

    /**
     * Call once Tendermint is synchronized. No transactions will be broadcast
     * until TxBroadcaster.prototype.start() is called.
     */
    public start(): boolean {
        this.started = true;
        return this.started;
    }

    /**
     * The external API for broadcasting local ABCI transactions. Provide the
     * raw transaction object, and it will be encoded, compressed, and added to
     * the broadcast queue. The promise that is returned by `this.send()`
     * resolves upon successful ABCI broadcast, with the JSON response. It will
     * reject or throw an error if the transaction fails to submit, but will
     * resolve even on a successful but rejected ABCI transaction.
     *
     * @param tx    {object}    raw transaction object to enqueue
     */
    public async send(tx: SignedTransaction): Promise<any> {
        // Create new EventEmitter for this tx
        const ee = new EventEmitter();

        // Resolve or reject promise based on EE events
        const res = new Promise((resolve, reject) => {
            ee.on("sent", resolve);     // Successful request, resolve to resp.
            ee.on("failed", reject);    // Failed request, resolve to error.
            ee.on("error", reject);     // Error in EE, resolve to null.
        });

        // Add transaction and emitter to queue (in array)
        this.enqueue([tx, ee]);

        // Await transaction execution and return result.
        return await res;
    }

    /**
     * Internal broadcast function. Executes ABCI transactions via a queue.
     */
    private async broadcast(): Promise<void> {
        // Return immediately if this.start() hasn't been called
        if (!(this.started)) { return; }

        // Store this reference, update status
        // tslint:disable-next-line:variable-name
        const _this = this;
        this.broadcasting = true;

        // Get next Tx in queue, do nothing if empty
        const txArr: any[] = this.dequeue();
        if (txArr === null || txArr.length !== 2) { return; }

        // Unpack txArr
        const txObject: any = txArr[0];
        const txEmitter: EventEmitter = txArr[1];

        // Compress and encode Tx
        const payload = PayloadCipher.txEncodeFromObject(txObject);

        try {
            // Await ABCI response, and resolve promise
            const res = await this.client.broadcastTxSync({
                tx: `"${ payload }"`,
            });

            // Resolve promise to response object
            txEmitter.emit("sent", res);
        } catch (error) {
            // Reject promise to error object
            txEmitter.emit("failed", error);
            err("tx", `failed to send abci transaction: ${error.message}`);
        } // finally {
        // @TODO: should this be inside 'finally'?
        // If queue is now empty, stop broadcasting
        if (_this.isEmpty()) {
            this.broadcasting = false;
            return;
        }

        // Otherwise, move onto the next Tx
        this.broadcast();
        // }
        return;
    }

    /**
     * Returns true if transaction queue is empty
     */
    private isEmpty(): boolean {
        return this.queue.length === 0;
    }

    /**
     * Add an item to the queue.
     *
     * @param item  {any}   item to add to queue
     */
    private enqueue(item: any): void {
        this.queue.push(item);      // Add transaction to queue
        this.tracker.emit("tx");    // Trigger broadcast processes
        return;
    }

    /**
     * Returns the top item from the queue, and removes it.
     */
    private dequeue(): any {
        if (this.isEmpty()) { return null; }
        return this.queue.shift();
    }
}
