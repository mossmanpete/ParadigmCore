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
const PayloadEncoder_1 = require("./PayloadEncoder");
const Message_1 = require("./Message");
const config_1 = require("./config");
let pe = new PayloadEncoder_1.PayloadEncoder({
    inputEncoding: 'utf8',
    outputEncoding: 'base64'
});
let app = express();
app.use(cors());
app.use(bodyParser.json());
app.post("/post", (req, res) => {
    try {
        let payloadStr = pe.encodeFromObject(req.body);
        Message_1.Message.staticSend(res, payloadStr);
    }
    catch (error) {
        console.log(error); // DEBUG
        Message_1.Message.staticSendError(res, "Error parsing order, check format and try again.", 400);
    }
});
app.listen(config_1.API_PORT, () => {
    console.log(`[PC@${config_1.VERSION}: ${new Date().toLocaleString()}] Server started on port ${config_1.API_PORT}.`);
});
