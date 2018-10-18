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

import * as express from "express";
import * as http from "http";
import * as bodyParser from "body-parser";
import cors = require('cors');
let { RpcClient } = require('tendermint');

import { PayloadCipher } from "../crypto/PayloadCipher"; 
import { Message } from "../net/ExpressMessage";

import { Logger } from "../util/Logger";
import { messages as msg } from "../util/messages";

import { API_PORT, ABCI_HOST, ABCI_RPC_PORT, TX_MODE} from "../config";

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
            type: "OrderBroadcast",
            data: req.body
        });
    } catch (error) {
        Logger.apiErr(msg.api.errors.parsing);
        Message.staticSendError(res, msg.api.errors.parsing, 400);
    }

    client.broadcastTxSync({tx:payloadStr}).then(r => {
        res.send(r);
    }).catch(e => {
        console.log(e);
        Message.staticSendError(res, e.message, 500);
    });

    /*
    let options = {
        hostname: ABCI_HOST,
        port: ABCI_RPC_PORT,
        path: `/broadcast_tx_${TX_MODE}?tx=\"${payloadStr}\"`
    }

    http.get(options, function(getres) {
        if(res.statusCode != 200){
            Message.staticSendError(res, "Internal server error.", 500);
        }
      
        getres.on("data", function(chunk) {
            res.send(chunk);
        });

      }).on('error', function(e) {
        Message.staticSendError(res, e.message, 500);
      });
      */
});

//export function startAPIserver(host, rpcPort, apiPort): void {
export async function startAPIserver(host, rpcPort, apiPort) {
    try {
        client = RpcClient(`ws://localhost:26657`);      
        await app.listen(apiPort) /*, () => {
            Logger.apiEvt(msg.api.messages.servStart);
        });*/
        Logger.apiEvt(msg.api.messages.servStart)
        return
    } catch (err) {
        throw new Error('Error starting API server');
    }
}
