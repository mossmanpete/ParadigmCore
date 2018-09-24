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

import * as express from "express";
import * as http from "http";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import { PayloadCipher } from "./PayloadCipher"; 
import { Message } from "./Message";

import { API_PORT, VERSION } from "./config";

let pe = new PayloadCipher({
    inputEncoding: 'utf8',
    outputEncoding: 'base64'
});

let app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(function (err, req, res, next) {
    Message.staticSendError(res, "Bad JSON format, check TX and try again.", 400);
});

app.post("/post", (req, res) => {
    try {
        let payloadStr = pe.encodeFromObject(req.body)
        console.log(payloadStr) // temporary
        Message.staticSend(res, payloadStr); // temporary
    } catch (error) {
        console.log(error) // DEBUG
        Message.staticSendError(res, "Error parsing order, check format and try again.", 400);
    }

    // deliver TX to ABCI server here
});

// to run in-process version, should we have `export function start(){app.listen(...)}` ???
app.listen(API_PORT, () => {
    console.log(`[PC@${VERSION}: ${new Date().toLocaleString()}] Server started on port ${API_PORT}.`);
});
