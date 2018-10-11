/*
  =========================
  ParadigmCore: Blind Star
  server.ts @ {master}
  =========================

  @date_inital 24 September 2018
  @date_modified 3 October 2018
  @author Henry Harder

  HTTP server to enable incoming orders to be recieved as POST requests.
*/

import * as express from "express";
import * as http from "http";
import * as bodyParser from "body-parser";
import * as cors from "cors";

import { PayloadCipher } from "./PayloadCipher"; 
import { Message } from "./ExpressMessage";
import { Logger } from "./Logger";
import { messages as msg } from "./messages";

import { API_PORT, ABCI_HOST, ABCI_RPC_PORT, TX_MODE} from "./config";

let pe = new PayloadCipher({
    inputEncoding: 'utf8',
    outputEncoding: 'base64'
});

let app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(function (err, req, res, next) {
    try {
        Message.staticSendError(res, msg.api.errors.badJSON, 400);
    } catch (err) {
        console.log(`Temporary log: ${err}`);
        throw new Error("Error sending HTTP response.");
    }
});

app.post("/*", (req, res) => {
    let payloadStr: string;
    try {
        payloadStr = pe.encodeFromObject(req.body)
    } catch (error) {
        console.log(`Temporary log: ${error}`);
        Message.staticSendError(res, msg.api.errors.parsing, 400);
    }

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
});

export function startAPIserver(): void {
    app.listen(API_PORT, () => {
        Logger.logEvent(msg.api.messages.servStart);
    });
}
