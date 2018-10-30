"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let client = require('axios');
const url_1 = require("url");
// ParadigmCore classes
const PayloadCipher_1 = require("../crypto/PayloadCipher");
class LocalPoster {
    /**
     * Create a new HTTP Tendermint transaction poster. Provide host, port,
     * and broadcast transaction mode.
     *
     * @param host  {string}    Tendermint RPC host
     * @param port  {number}    Tendermint RPC port
     * @param mode  {string}    broadcast mode ('sync', 'async', or 'commit')
     */
    constructor(mode, host, port) {
        // Validate and set endpoint
        try {
            this.endpoint = new url_1.URL(`http://${host}:${port}/`);
        }
        catch (err) {
            throw new Error("Invalid endpoint.");
        }
        // Set transaction broadcast mode
        switch (mode) {
            case 'async': {
                this.txMode = "broadcast_tx_async";
                break;
            }
            case 'sync': {
                this.txMode = "broadcast_tx_sync";
                break;
            }
            case 'commit': {
                this.txMode = "broadcast_tx_commit";
                break;
            }
            default: {
                throw new Error("Invalid broadcast mode");
            }
        }
    }
    async send(type, rawTx) {
        // JSON HTTP response
        let res;
        // Declare (and scope) tx objects
        let tx; // Formatted tx object
        let payload; // Compressed and encoded payload
        // Construct TX object based on type
        switch (type) {
            case 'order': {
                tx = { type: "order", data: rawTx };
                break;
            }
            case 'stream': {
                tx = { type: "stream", data: rawTx };
                break;
            }
            default: {
                throw new Error("Invalid transaction type.");
            }
        }
        // Compress and encode transaction
        payload = PayloadCipher_1.PayloadCipher.encodeFromObject(tx);
        // Execute HTTP request
        try {
            // Await request completion
            res = await client(this.getOptions(payload));
            // Return response from Tendermint
            return res;
        }
        catch (err) {
            console.log(`(LocalPoster) Error: ${err}`);
            throw new Error("Failed to execute local ABCI transaction.");
        }
    }
    getOptions(param) {
        return {
            method: "post",
            url: this.endpoint.href,
            headers: {
                "Content-Type": "application/json"
            },
            data: {
                method: this.txMode,
                jsonrpc: "2.0",
                params: [param],
                id: "paradigmcore"
            },
            responseType: "json",
            responseEncoding: "utf8"
        };
    }
}
exports.default = LocalPoster;
