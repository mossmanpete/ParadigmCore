/*
  =========================
  ParadigmCore: Blind Star
  index.ts @ {master}
  =========================

  @date_inital 12 September 2018
  @date_modified 2 October 2018
  @author Henry Harder

  Main ABCI application supporting the OrderStream network. 
*/

import * as abci from 'abci';
import * as _ws from "ws";
import * as _pjs from "paradigm.js";

import { EventEmitter } from "events";
import { startAPIserver } from "./server";
import { state } from "./state";
import { ABCI_PORT, VERSION, WS_PORT } from "./config";
import { Logger } from "./Logger";
import { Vote } from "./Vote";
import { PayloadCipher } from "./PayloadCipher";
import { WebSocketMessage } from "./WebSocketMessage";
import { Hasher } from './Hasher';

let emitter = new EventEmitter(); // event emitter for WS
let wss = new _ws.Server({ port: WS_PORT });
let cipher = new PayloadCipher({ inputEncoding: 'utf8', outputEncoding: 'base64' });
let paradigm = new _pjs(); // new paradigm instance
let Order = paradigm.Order;

wss.on("connection", (ws) => {
  try {
    WebSocketMessage.sendMessage(ws, `Connected to the OrderStream network at ${new Date().toLocaleString()}`);
  } catch (err) {
    Logger.logError("Error on WebSocket connection.");
  }

  emitter.on("order", (order) => {
    try {
      WebSocketMessage.sendOrder(ws, order);
    } catch (err) {
      console.log('after emitter: ' + err);
      Logger.logError("Error broadcasting websocket event.");
    }
  });

  ws.on('message', (msg) => {
    try {
      WebSocketMessage.sendMessage(ws, `Unknown command '${msg}.'`);
    } catch (err) {
      Logger.logError("Error sending websocket response message.");
    }
  });
});

wss.on('listening', (_) => {
  Logger.logEvent(`WS server started on port ${WS_PORT}.`);
});

let handlers = {
  info: (_) => {
    return {
      data: 'Stake Verification App',
      version: VERSION,
      lastBlockHeight: 0,
      lastBlockAppHash: Buffer.alloc(0)
    }
  },

  checkTx: (request) => {
    let txObject;

    Logger.logEvent(`Incoming external ABCI transaction`);

    try {
      txObject = cipher.ABCIdecode(request.tx);
    } catch (error) {
      Logger.logEvent("Bad order post, error decompressing TX - rejected (checkTx)");
      return Vote.invalid("Bad order, error decompressing TX");
    }

    try {      
      let newOrder = new Order(txObject);
      let recoveredAddr = newOrder.recoverPoster();
      if (typeof(recoveredAddr) === "string"){
        /*
          The above conditional shoud rely on a verifyStake(), that checks
          the existing state for that address. 
        */
        Logger.logEvent(`Order added to mempool from: ${recoveredAddr}`);
        return Vote.valid(`Stake verified, order added to mempool.`, Hasher.hashOrder(newOrder));
      } else {
        Logger.logEvent("Bad order post, no stake - rejected (checkTx)")
        return Vote.invalid('Bad order maker - no stake.');
      }
    } catch (error) {
      Logger.logEvent("Bad order post, bad format - rejected (checkTx)");
      return Vote.invalid('Bad order format.');
    }
  },

  deliverTx: (request) => {
    let txObject;

    Logger.logEvent(`Incoming external ABCI transaction`);
    
    try {
      txObject = cipher.ABCIdecode(request.tx);
    } catch (error) {
      Logger.logEvent("Bad order, error decompressing - rejected (deliverTx)")
      return Vote.invalid('Bad order - error decompressing TX.');
    }

    try {      
      let newOrder = new Order(txObject);
      let recoveredAddr = newOrder.recoverPoster();

      if (typeof(recoveredAddr) === "string"){ 
        /*
          The above conditional shoud rely on a verifyStake(), that checks
          the existing state for that address. 

          BEGIN STATE MODIFICATION
        */

        let dupOrder: any = newOrder.toJSON();
        dupOrder.id = Hasher.hashOrder(newOrder);
        emitter.emit("order", dupOrder); // broadcast order event
        state.number += 1;

        /*
          END STATE MODIFICATION
        */

        Logger.logEvent("Valid order received (in deliverTx)")
        return Vote.valid(`Success: stake of '${recoveredAddr}' verified.`, dupOrder.id);
      } else {
        Logger.logEvent("Bad order post, no stake - rejected (deliverTx)")
        return Vote.invalid('Bad order maker - no stake.');
      }
    } catch (error) {
      console.log(error);
      Logger.logEvent("Bad order post, bad format - rejected (deliverTx)");
      return Vote.invalid('Bad order format.');
    }
  }
}

abci(handlers).listen(ABCI_PORT, () => {
  Logger.logEvent(`ABCI server started on port ${ABCI_PORT}.`);
  startAPIserver();
});
