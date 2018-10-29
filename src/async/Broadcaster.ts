import { URL } from "url";
import { EventEmitter } from "events";
import { RpcClient } from "tendermint";

import { PayloadCipher } from "../crypto/PayloadCipher";
import { Queue } from "../util/Queue";

export class Broadcaster extends EventEmitter{
    // Tendermint ABCI connection
    private client: any;    // Tendermint client
    private abciUrl: URL;   // ABCI RPC URI

    // Queue and status
    private queue: Queue;       // Stores Tx's awaiting broadcast
    private started: boolean;   // 'true' if connected to client
    private ready: boolean;     // 'true' if ready to send a Tx

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
            this.abciUrl = new URL(`ws://${host}:${port}`);
        } catch (err) {
            console.log('"Invalid Tendermint RPC URL."');
            throw new Error("Invalid Tendermint RPC URL.");
        }

        // Create a blank queue
        this.queue = new Queue();

        // Not ready yet
        this.started = false;
        this.ready = false;
    }

    public connect(): void {
        // Store `this`
        let _this = this;

        // Make sure not already connected
        if (this.ready) return;

        // Connect to Tendermint ABCI server
        try {
            this.client = RpcClient(this.abciUrl.href);
        } catch (err) {
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
            if (_this.ready) _this.send();
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
    public add(tx: any): void {
        // Compress and encode transaction
        let payload = PayloadCipher.encodeFromObject(tx);
        this.queue.add(payload);

        // Trigger transaction broadcast
        this.emit('tx');
    }

    /**
     * Returns true if broadcaster has been started, false otherwise.
     */
    public isStarted(): boolean {
        return this.started;
    }

    private send() {
        console.log('(BROADCASTER) Sending tx.');
        // Store this reference, mark as not ready
        var _this = this;
        this.ready = false;

        // Get next Tx in queue, do nothing if empty
        let txPayload = this.queue.remove();
        if (txPayload === null) return;

        // Broadcast Tx (USING SYNC MODE)
        let broadcast = this.client.broadcastTxSync({
            tx: txPayload
        }).then(r => {
            // Temporary log
            console.log(`(BROADCASTER) Sent. Res: ${JSON.stringify(r)}`);

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