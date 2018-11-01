/*
  =========================
  ParadigmCore: Blind Star
  server.ts @ {master}
  =========================

  @date_initial 24 September 2018
  @date_modified 31 October 2018
  @author Henry Harder

  HTTP server to enable incoming orders to be recieved as POST requests.

  @10-16: TODO: support StreamBroadcast type.
*/

import * as express from "express";
import * as bodyParser from "body-parser";
import cors = require('cors');

import { Message } from "../net/ExpressMessage";
import { Logger } from "../util/Logger";
import { messages as msg } from "../util/messages";
import { TxBroadcaster } from "src/abci/TxBroadcaster";

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
    let tx = {type: "order", data: req.body};

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
