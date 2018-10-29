"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  server.ts @ {master}
  =========================

  @date_inital 24 September 2018
  @date_modified 19 October 2018
  @author Henry Harder

  HTTP server to enable incoming orders to be recieved as POST requests.

  @10-16: TODO: support StreamBroadcast type.
*/
Object.defineProperty(exports, "__esModule", { value: true });
let { RpcClient } = require('tendermint');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const ExpressMessage_1 = require("../net/ExpressMessage");
const Logger_1 = require("../util/Logger");
const messages_1 = require("../util/messages");
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
    let payloadStr;
    try {
        payloadStr = PayloadCipher_1.PayloadCipher.encodeFromObject({
            type: "order ",
            data: req.body
        });
    }
    catch (error) {
        Logger_1.Logger.apiErr(messages_1.messages.api.errors.parsing);
        ExpressMessage_1.Message.staticSendError(res, messages_1.messages.api.errors.parsing, 400);
    }
    client.broadcastTxSync({ tx: payloadStr }).then(r => {
        res.send(r);
    }).catch(e => {
        console.log(e);
        ExpressMessage_1.Message.staticSendError(res, e.message, 500);
    });
});
async function startAPIserver(host, rpcPort, apiPort) {
    try {
        client = RpcClient(`ws://${host}:${rpcPort}`);
        await app.listen(apiPort);
        Logger_1.Logger.apiEvt(messages_1.messages.api.messages.servStart);
        return;
    }
    catch (err) {
        throw new Error('Error starting API server');
    }
}
exports.startAPIserver = startAPIserver;
