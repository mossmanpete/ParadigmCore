"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  server.ts @ {master}
  =========================

  @date_initial 24 September 2018
  @date_modified 29 October 2018
  @author Henry Harder

  HTTP server to enable incoming orders to be recieved as POST requests.

  @10-16: TODO: support StreamBroadcast type.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const ExpressMessage_1 = require("../net/ExpressMessage");
const Logger_1 = require("../util/Logger");
const messages_1 = require("../util/messages");
const LocalPoster_1 = require("./LocalPoster");
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
app.post("/*", (req, res) => {
    try {
        client.send("order", req.body).then(r => {
            console.log(`(temp) Sent order via LocalPoster: ${r}`);
            ExpressMessage_1.Message.staticSend(res, r);
        }).catch(e => {
            console.log(`(temp) Error sending via LocalPoster: ${e}`);
        });
    }
    catch (error) {
        Logger_1.Logger.apiErr(error.message);
        ExpressMessage_1.Message.staticSendError(res, messages_1.messages.api.errors.parsing, 400);
    }
    /*
    let payloadStr: string;
    try {
        payloadStr = PayloadCipher.encodeFromObject({
            type: "order",
            data: req.body
        });
    } catch (error) {
        Logger.apiErr(msg.api.errors.parsing);
        Message.staticSendError(res, msg.api.errors.parsing, 400);
    }

    // TODO fix this
    console.log("SENDING TX: " + payloadStr);
    client.broadcastTxSync({tx:payloadStr}).then(r => {
        res.send(r);
    }).catch(e => {
        console.log(e);
        Message.staticSendError(res, e.message, 500);
    });
    */
});
async function startAPIserver(host, rpcPort, apiPort) {
    try {
        // Create HTTP poster instance
        client = new LocalPoster_1.default("sync", host, rpcPort);
        await app.listen(apiPort);
        Logger_1.Logger.apiEvt(messages_1.messages.api.messages.servStart);
        return;
    }
    catch (err) {
        throw new Error('Error starting API server');
    }
}
exports.startAPIserver = startAPIserver;
