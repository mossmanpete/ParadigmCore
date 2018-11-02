"use strict";
/**
  =========================
  ParadigmCore: Blind Star
  TxBroadcaster.ts @ {master}
  =========================

  @date_initial 15 October 2018
  @date_modified 1 November 2018
  @author Henry Harder

  This class is responsible for executing local ABCI transactions. It
  implements a queue, and allows multiple "concurrant" usage of a given
  instance for local ABCI tx's, so only one instance should be used per node.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const Logger_1 = require("../util/Logger");
class TxBroadcaster {
    /**
     * Create a new TxBroadcaster instance.
     *
     * @param options   {object}    Options object with:
     *  - options.client    {RpcClient} Tendermint ABCI client
     */
    constructor(options) {
        let _this = this; // Store this reference
        // Instance properties
        this.client = options.client; // RPC client
        this.tracker = new events_1.EventEmitter(); // Order tracker
        this.queue = [];
        // Attach error handlers to client
        this.client.on('error', (err) => {
            Logger_1.Logger.txErr(`Error in Tendermint connection: ${err}`);
            throw new Error("Tendermint connection encountered error.");
        });
        this.client.on('close', (err) => {
            Logger_1.Logger.txErr(`Tendemint client closed: ${err}`);
            throw new Error("Tendermint connection terminated.");
        });
        // Attach handlers to tx tracker
        this.tracker.on('tx', function () {
            // We only need to start broadcasting if we aren't already
            if (!(_this.broadcasting))
                _this.broadcast();
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
    start() {
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
    async send(tx) {
        // Create new EventEmitter for this tx
        let ee = new events_1.EventEmitter();
        // Resolve or reject promise based on EE events
        let res = new Promise((resolve, reject) => {
            // Attach handlers
            ee.on('sent', resolve);
            ee.on('failed', reject);
            ee.on('error', reject);
        });
        // Add transaction and emitter to queue (in array)
        this.enqueue([tx, ee]);
        // Await transaction execution and return result.
        return await res;
    }
    /**
     * Internal broadcast function. Executes ABCI transactions via a queue.
     */
    async broadcast() {
        // Return immediatley if this.start() hasn't been called
        if (!(this.started))
            return;
        // Temporary
        Logger_1.Logger.txEvt('Sending internal ABCI transaction.');
        // Store this reference, update status
        let _this = this;
        this.broadcasting = true;
        // Get next Tx in queue, do nothing if empty
        let txArr = this.dequeue();
        if (txArr === null || txArr.length !== 2)
            return;
        // Unpack txArr
        let txObject = txArr[0];
        let txEmitter = txArr[1];
        // Compress and encode Tx
        let payload = PayloadCipher_1.PayloadCipher.encodeFromObject(txObject);
        try {
            // Await ABCI response, and resolve promise
            let res = await this.client.broadcastTxSync({ tx: `"${payload}"` });
            txEmitter.emit('sent', res);
            Logger_1.Logger.txEvt("Transaction sent successfully.");
        }
        catch (error) {
            Logger_1.Logger.txErr("Transaction failed.");
            // Resolve promise to error object
            txEmitter.emit('failed', error);
        }
        finally {
            // If queue is now empty, stop broadcasting
            if (_this.isEmpty()) {
                this.broadcasting = false;
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
    isEmpty() {
        return this.queue.length === 0;
    }
    /**
     * Add an item to the queue.
     *
     * @param item  {any}   item to add to queue
     */
    enqueue(item) {
        this.queue.push(item); // Add transaction to queue  
        this.tracker.emit('tx'); // Trigger broadcast processes
        return;
    }
    /**
     * Returns the top item from the queue, and removes it.
     */
    dequeue() {
        if (this.isEmpty())
            return null;
        return this.queue.shift();
    }
    /**
     * Returns the top item in the queue without removing it.
     */
    front() {
        if (this.isEmpty())
            return null;
    }
}
exports.TxBroadcaster = TxBroadcaster;
