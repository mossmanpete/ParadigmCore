"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  server.ts @ {rebalance-refactor}
  =========================

  @date_inital 24 September 2018
  @date_modified 16 October 2018
  @author Henry Harder

  HTTP server to enable incoming orders to be recieved as POST requests.

  @10-16: TODO: support StreamBroadcast type.
  @10-17: TODO: use npm 'tendermint' package to send ABCI transactions.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const ExpressMessage_1 = require("../net/ExpressMessage");
const Logger_1 = require("../util/Logger");
const messages_1 = require("../util/messages");
const config_1 = require("../config");
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
            type: "OrderBroadcast",
            data: req.body
        });
    }
    catch (error) {
        Logger_1.Logger.apiErr(messages_1.messages.api.errors.parsing);
        ExpressMessage_1.Message.staticSendError(res, messages_1.messages.api.errors.parsing, 400);
    }
    let options = {
        hostname: config_1.ABCI_HOST,
        port: config_1.ABCI_RPC_PORT,
        path: `/broadcast_tx_${config_1.TX_MODE}?tx=\"${payloadStr}\"`
    };
    http.get(options, function (getres) {
        if (res.statusCode != 200) {
            ExpressMessage_1.Message.staticSendError(res, "Internal server error.", 500);
        }
        getres.on("data", function (chunk) {
            res.send(chunk);
        });
    }).on('error', function (e) {
        ExpressMessage_1.Message.staticSendError(res, e.message, 500);
    });
});
function startAPIserver() {
    app.listen(config_1.API_PORT, () => {
        Logger_1.Logger.apiEvt(messages_1.messages.api.messages.servStart);
    });
}
exports.startAPIserver = startAPIserver;
