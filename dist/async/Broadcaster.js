"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const events_1 = require("events");
const tendermint_1 = require("tendermint");
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const Queue_1 = require("../util/Queue");
class Broadcaster extends events_1.EventEmitter {
    /**
     * Use to create a new Broadcaster instance. Must supply Tendermint RPC
     * configuration parameters.
     *
     * @param options   {object}    configuration options
     *  - options.host  {string}    Tendermint ABCI server host
     *  - options.port  {nunmber}   Tendermint ABCI server port
     */
    constructor(options) {
        // Establish EventEmitter properties
        super();
        // Tendermint configuration options
        let host = options.host;
        let port = options.port;
        // Check ABCI URL validity
        try {
            this.abciUrl = new url_1.URL(`ws://${host}:${port}`);
        }
        catch (err) {
            console.log('"Invalid Tendermint RPC URL."');
            throw new Error("Invalid Tendermint RPC URL.");
        }
        // Create a blank queue
        this.queue = new Queue_1.Queue();
        // Not ready yet
        this.started = false;
        this.ready = false;
    }
    connect() {
        // Store `this`
        let _this = this;
        // Make sure not already connected
        if (this.ready)
            return;
        // Connect to Tendermint ABCI server
        try {
            this.client = tendermint_1.RpcClient(this.abciUrl.href);
        }
        catch (err) {
            console.log("Unable to connect to Tendermint ABCI.");
            throw new Error("Unable to connect to Tendermint ABCI.");
        }
        // General error handler
        this.client.on('error', (err) => {
            console.log("Error in Tendermint connection.");
            console.log(err);
            throw new Error("Error in Tendermint connection.");
        });
        // Handle unexpected closure
        this.client.on('close', () => {
            console.log("Tendermint client disconnected unexpectedly.");
            throw new Error("Tendermint client disconnected unexpectedly.");
        });
        // Attach general event handlers
        this.on('tx', () => {
            // If we are already broadcasting, we don't need to start
            if (_this.ready)
                _this.send();
        });
        // temporary
        console.log('(BROADCASTER) Connected to tendermint');
        this.started = true;
        this.ready = true;
        return;
    }
    /**
     * Add an ABCI transaction to the broadcast queue. Compresses and encodes
     * transactions before submission via ABCI.
     *
     * @param tx {object}   raw transaction object to submit via ABCI
     */
    add(tx) {
        // Compress and encode transaction
        let payload = PayloadCipher_1.PayloadCipher.encodeFromObject(tx);
        this.queue.add(payload);
        // Trigger transaction broadcast
        this.emit('tx');
    }
    /**
     * Returns true if broadcaster has been started, false otherwise.
     */
    isStarted() {
        return this.started;
    }
    send() {
        console.log('(BROADCASTER) Sending tx.');
        // Store this reference, mark as not ready
        var _this = this;
        this.ready = false;
        // Get next Tx in queue, do nothing if empty
        let txPayload = this.queue.remove();
        if (txPayload === null)
            return;
        // Broadcast Tx (USING SYNC MODE)
        let broadcast = this.client.broadcastTxSync({
            tx: txPayload
        }).then(_ => {
            // If queue is now empty, stop broadcast cycle, mark as ready
            if (_this.queue.isEmpty()) {
                this.ready = true;
                return;
            }
            // Otherwise, broadcast next Tx in queue
            this.send();
        }).catch(e => {
            // Temporary log
            console.log("(BROADCASTER) Error: " + JSON.stringify(e));
            throw new Error("Error broadcasting ABCI transaction.");
        });
        return;
    }
}
exports.Broadcaster = Broadcaster;
