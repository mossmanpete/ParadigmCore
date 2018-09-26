/*
  =========================
  Blind Star - codename (developent)
  server.ts @ {master}
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
import { Logger } from "./Logger";

import { API_PORT, ABCI_HOST, ABCI_RPC_PORT} from "./config";

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

app.post("/*", (req, res) => {
    let payloadStr: string;
    try {
        payloadStr = pe.encodeFromObject(req.body)
    } catch (error) {
        Message.staticSendError(res, "Error parsing order, check format and try again.", 400);
    }

    let options = {
        hostname: ABCI_HOST,
        port: ABCI_RPC_PORT,
        path: `/broadcast_tx_sync?tx=\"${payloadStr}\"`
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

// to run in-process version, should we have `export function start(){app.listen(...)}` ???
export function startAPIserver(): void {
    app.listen(API_PORT, () => {
        Logger.logEvent(`API server started on port ${API_PORT}.`);
    });
}
