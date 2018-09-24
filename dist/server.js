"use strict";
/*
  =========================
  Blind Star - codename (developent)
  server.ts @ {server}
  =========================
  @date_inital 24 September 2018
  @date_modified 24 September 2018
  @author Henry Harder

  HTTP server to enable incoming orders to be recieved as POST requests.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const PayloadCipher_1 = require("./PayloadCipher");
const Message_1 = require("./Message");
const config_1 = require("./config");
let pe = new PayloadCipher_1.PayloadCipher({
    inputEncoding: 'utf8',
    outputEncoding: 'base64'
});
let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(function (err, req, res, next) {
    Message_1.Message.staticSendError(res, "Bad JSON format, check TX and try again.", 400);
});
app.post("/post", (req, res) => {
    try {
        let payloadStr = pe.encodeFromObject(req.body);
        console.log(payloadStr); // temporary
        Message_1.Message.staticSend(res, payloadStr); // temporary
    }
    catch (error) {
        console.log(error); // DEBUG
        Message_1.Message.staticSendError(res, "Error parsing order, check format and try again.", 400);
    }
    // deliver TX to ABCI server here
});
// to run in-process version, should we have `export function start(){app.listen(...)}` ???
app.listen(config_1.API_PORT, () => {
    console.log(`[PC@${config_1.VERSION}: ${new Date().toLocaleString()}] Server started on port ${config_1.API_PORT}.`);
});
