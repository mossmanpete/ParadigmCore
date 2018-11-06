/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name TxBroadcaster.ts
 * @module src/abci
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  15-October-2018
 * @date (modified) 05-November-2018
 *
 * This class is responsible for executing local ABCI transactions. It
 * implements a queue, and allows multiple "concurrant" usage of a given
 * instance for local ABCI tx's, so only one instance should be used per node.
 */

// 3rd party and STDLIB imports
import { EventEmitter } from "events";

// ParadigmCore classes
import { PayloadCipher } from "../../crypto/PayloadCipher";
import { Logger } from "../../util/Logger";
import { Transaction } from "./Transaction";

export class TxBroadcaster {
    private client: any;            // Tendermint RPC client
    private queue: any[][];         // Pending transaction queue
    private tracker: EventEmitter;  // Enables async order broadcast

    private started: boolean;       // Transactions will be sent only if true
    private broadcasting: boolean;  // True while sending tx's

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
        this.client.on("error", (err) => {
            Logger.txErr(`Error in Tendermint connection: ${err}`);
            throw new Error("Tendermint connection encountered error.");
        });
        this.client.on("close", (err) => {
            Logger.txErr(`Tendemint client closed: ${err}`);
            throw new Error("Tendermint connection terminated.");
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
     * Call once Tendermint is synchronized. No transactions will be braodcast
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
     * resolves upon succesful ABCI broadcast, with the JSON repsonse. It will
     * reject or throw an error if the transaction fails to submit, but will
     * resolve even on a succesful but rejected ABCI transaction.
     *
     * @param tx    {object}    raw transaction object to enqueue
     */
    public async send(tx: Transaction): Promise<any> {
        // Create new EventEmitter for this tx
        const ee = new EventEmitter();

        // Resolve or reject promise based on EE events
        const res = new Promise((resolve, reject) => {

            // Attach handlers
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
    private async broadcast() {
        // Return immediatley if this.start() hasn't been called
        if (!(this.started)) { return; }

        // Temporary?
        Logger.txEvt("Sending internal ABCI transaction.");

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
        const payload = PayloadCipher.encodeFromObject(txObject);

        try {
            // Await ABCI response, and resolve promise
            const res = await this.client.broadcastTxSync({
                tx: `"${ payload }"`,
            });

            // Resolve promise to response object
            txEmitter.emit("sent", res);
            Logger.txEvt("Transaction sent successfully.");
        } catch (error) {
            // Reject promise to error object
            txEmitter.emit("failed", error);
            Logger.txErr("Transaction failed.");
        } finally {
            // @TODO: should this be outside 'finally'?
            // If queue is now empty, stop broadcasting
            if (_this.isEmpty()) {
                this.broadcasting = false;

                // tslint:disable-next-line:no-unsafe-finally
                return;
            }

            // Otherwise, move onto the next Tx
            this.broadcast();
        }
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