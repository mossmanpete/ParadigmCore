let client: any = require('axios');
import { URL } from "url";      

// ParadigmCore classes
import { PayloadCipher } from "../crypto/PayloadCipher";

export default class LocalPoster {
    private endpoint: URL;  // Tendermint ABCI endpoint
    private txMode: string; // TX broadcast mode

    /**
     * Create a new HTTP Tendermint transaction poster. Provide host, port,
     * and broadcast transaction mode.
     * 
     * @param host  {string}    Tendermint RPC host    
     * @param port  {number}    Tendermint RPC port
     * @param mode  {string}    broadcast mode ('sync', 'async', or 'commit')
     */
    constructor(mode: string, host: string, port: number){
        // Validate and set endpoint
        try {
            this.endpoint = new URL(`http://${host}:${port}/`);
        } catch (err) {
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

    public async send(type: string, rawTx: any): Promise<any> {
        // JSON HTTP response
        let res: any;

        // Declare (and scope) tx objects
        let tx: any;            // Formatted tx object
        let payload: string;    // Compressed and encoded payload

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
        payload = PayloadCipher.encodeFromObject(tx);

        // Execute HTTP request
        try {
            // Await request completion
            res = await client(this.getOptions(payload));

            // Return response from Tendermint
            return res;
        } catch (err) {
            console.log(`(LocalPoster) Error: ${err}`);
            throw new Error("Failed to execute local ABCI transaction.");
        }
    }

    public getOptions(param: string): any {
        return {
            method: "post",
            url: this.endpoint.href,
            headers: {
                "Content-Type":"application/json"
            },
            data: {
                method: this.txMode,
                jsonrpc: "2.0",
                params: [ param ],
                id: "paradigmcore"
            },
            responseType: "json",
            responseEncoding: "utf8" 
        }
    }
}