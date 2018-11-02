/*
  =========================
  ParadigmCore: Blind Star
  server.ts @ {master}
  =========================

  @date_initial 24 September 2018
  @date_modified 1 November 2018
  @author Henry Harder

  HTTP server to enable incoming orders to be recieved as POST requests.

  @10-16: TODO: support StreamBroadcast type.
*/

// 3rd party imports
import * as express from "express";
import * as bodyParser from "body-parser";
import cors = require('cors');

// ParadigmCore classes and imports
import { Message } from "../net/ExpressMessage";
import { Logger } from "../util/Logger";
import { messages as msg } from "../util/static/messages";
import { TxBroadcaster } from "../abci/TxBroadcaster";
import { Transaction } from "../abci/Transaction";

let client: TxBroadcaster; // tendermint client for RPC
let app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(function (err, req, res, next) {
    try {
        Message.staticSendError(res, msg.api.errors.badJSON, 400);
    } catch (err) {
        Logger.apiErr(msg.api.errors.response);
    }
});

app.post("/*", async (req, res) => {
    // Create transaction object
    let tx: Transaction;

    try {
        tx = new Transaction("order", req.body);
    } catch (err) {
        Logger.apiErr("Failed to construct local transaction object.");
        Message.staticSendError(res, "Internal transaction error, try again.", 500);
    }

    // Execute local ABCI transaction
    try {
        // Await ABCI response
        let response = await client.send(tx);

        // Send response back to client
        Logger.apiEvt("Successfully executed local ABCI transaction.");
        Message.staticSend(res, response);
    } catch (error) {
        Logger.apiErr("Failed to execute local ABCI transaction");
        Message.staticSendError(res, "Internal error, try again.", 500);
    }      
});

/**
 * Start and bind API server.
 * 
 * @param apiPort       {number}        port to bind API server to
 * @param broadcaster   {TxBroadcaster} local transaction broadcaster
 */
export async function startAPIserver(apiPort, broadcaster) {
    try {
        // Create HTTP poster instance
        client = broadcaster;

        // Start API server
        await app.listen(apiPort);
        Logger.apiEvt(msg.api.messages.servStart)
        return;
    } catch (err) {
        throw new Error('Error starting API server');
    }
}
