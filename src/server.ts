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
import { PayloadEncoder } from "./PayloadEncoder"; 
import { Message } from "./Message";

import { API_PORT, VERSION } from "./config";

let pe = new PayloadEncoder({
    inputEncoding: 'utf8',
    outputEncoding: 'base64'
});

let app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/post", (req, res) => {
    try {
        let payloadStr = pe.encodeFromObject(req.body)
    } catch (error) {
        console.log(error) // DEBUG
        Message.staticSendError(res, "Error parsing order, check format and try again.", 400);
    }
    Message.staticSend(res, payloadStr);
});

app.listen(API_PORT, () => {
    console.log(`[PC@${VERSION}: ${new Date().toLocaleString()}] Server started on port ${API_PORT}.`);
});