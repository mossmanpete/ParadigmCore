"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party imports
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
// ParadigmCore classes and imports
const ExpressMessage_1 = require("../net/ExpressMessage");
const Logger_1 = require("../util/Logger");
const messages_1 = require("../util/static/messages");
const Transaction_1 = require("../abci/Transaction");
let client; // tendermint client for RPC
let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(function (err, req, res, next) {
    try {
        ExpressMessage_1.Message.staticSendError(res, messages_1.messages.api.errors.badJSON, 400);
    }
    catch (err) {
        Logger_1.Logger.apiErr(messages_1.messages.api.errors.response);
    }
});
app.post("/*", async (req, res) => {
    // Create transaction object
    let tx;
    try {
        tx = new Transaction_1.Transaction("order", req.body);
    }
    catch (err) {
        Logger_1.Logger.apiErr("Failed to construct local transaction object.");
        ExpressMessage_1.Message.staticSendError(res, "Internal transaction error, try again.", 500);
    }
    // Execute local ABCI transaction
    try {
        // Await ABCI response
        let response = await client.send(tx);
        // Send response back to client
        Logger_1.Logger.apiEvt("Successfully executed local ABCI transaction.");
        ExpressMessage_1.Message.staticSend(res, response);
    }
    catch (error) {
        console.log(error);
        Logger_1.Logger.apiErr("Failed to execute local ABCI transaction");
        ExpressMessage_1.Message.staticSendError(res, "Internal error, try again.", 500);
    }
});
/**
 * Start and bind API server.
 *
 * @param apiPort       {number}        port to bind API server to
 * @param broadcaster   {TxBroadcaster} local transaction broadcaster
 */
async function startAPIserver(apiPort, broadcaster) {
    try {
        // Create HTTP poster instance
        client = broadcaster;
        // Start API server
        await app.listen(apiPort);
        Logger_1.Logger.apiEvt(messages_1.messages.api.messages.servStart);
        return;
    }
    catch (err) {
        throw new Error('Error starting API server');
    }
}
exports.startAPIserver = startAPIserver;
