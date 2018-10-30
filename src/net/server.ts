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

let { RpcClient } = require('tendermint');
import * as express from "express";
import * as bodyParser from "body-parser";
import cors = require('cors');

import { PayloadCipher } from "../crypto/PayloadCipher"; 
import { Message } from "../net/ExpressMessage";

import { Logger } from "../util/Logger";
import { messages as msg } from "../util/messages";

let client: any; // tendermint client for RPC
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

app.post("/*", (req, res) => {

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
});

export async function startAPIserver(host, rpcPort, apiPort) {
    try {
        client = RpcClient(`http://${host}:${rpcPort}`); 
        
        await app.listen(apiPort);
        Logger.apiEvt(msg.api.messages.servStart)
        return
    } catch (err) {
        throw new Error('Error starting API server');
    }
}
