/*
  =========================
  ParadigmCore: Blind Star
  index.ts @ {master}
  =========================

  @date_inital 12 September 2018
  @date_modified 3 October 2018
  @author Henry Harder

  Main ABCI application supporting the OrderStream network. 
*/

import * as abci from 'abci';
import * as _ws from "ws";
import * as _pjs from "paradigm.js";

import { EventEmitter } from "events";
import { startAPIserver } from "./server";
import { state } from "./state";
import { messages as msg } from "./messages"
import { ABCI_PORT, VERSION, WS_PORT } from "./config";
import { Logger } from "./Logger";
import { Vote } from "./Vote";
import { PayloadCipher } from "./PayloadCipher";
import { WebSocketMessage } from "./WebSocketMessage";
import { Hasher } from './Hasher';
import { OrderTracker } from "./OrderTracker"

let emitter = new EventEmitter(); // event emitter for WS
let wss = new _ws.Server({ port: WS_PORT });
let tracker = new OrderTracker(emitter);
let cipher = new PayloadCipher({ inputEncoding: 'utf8', outputEncoding: 'base64' });
let paradigm = new _pjs(); // new paradigm instance
let Order = paradigm.Order;

wss.on("connection", (ws) => {
  try {
    WebSocketMessage.sendMessage(ws, msg.websocket.messages.connected);
  } catch (err) {
    Logger.logError(msg.websocket.errors.connect);
  }

  emitter.on("order", (order) => {
    try {
      wss.clients.forEach(client => {
        if (client.readyState === _ws.OPEN){
          WebSocketMessage.sendOrder(client, order);
        }
      });
    } catch (err) {
      Logger.logError(msg.websocket.errors.broadcast);
    }
  });

  ws.on('message', (msg) => {
    try {
      WebSocketMessage.sendMessage(ws, `Unknown command '${msg}.'`);
    } catch (err) {
      Logger.logError(msg.websocket.errors.message);
    }
  });
});

wss.on('listening', (_) => {
  Logger.logEvent(msg.websocket.messages.servStart);
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

    Logger.logEvent(msg.abci.messages.incoming.checkTx);

    try {
      txObject = cipher.ABCIdecode(request.tx);
    } catch (error) {
      Logger.logEvent(msg.abci.errors.decompress);
      return Vote.invalid(msg.abci.errors.decompress);
    }

    try {      
      let newOrder = new Order(txObject);
      let recoveredAddr = newOrder.recoverPoster();
      if (typeof(recoveredAddr) === "string"){
        /*
          The above conditional shoud rely on a verifyStake(), that checks
          the existing state for that address. 
        */
        Logger.logEvent(msg.abci.messages.mempool);
        return Vote.valid(Hasher.hashOrder(newOrder));
      } else {
        Logger.logEvent(msg.abci.messages.noStake)
        return Vote.invalid(msg.abci.messages.noStake);
      }
    } catch (error) {
      Logger.logEvent(msg.abci.errors.format);
      return Vote.invalid(msg.abci.errors.format);
    }
  },

  deliverTx: (request) => {
    let txObject;

    Logger.logEvent(msg.abci.messages.incoming.deliverTx);
    
    try {
      txObject = cipher.ABCIdecode(request.tx);
    } catch (error) {
      Logger.logEvent(msg.abci.errors.decompress)
      return Vote.invalid(msg.abci.errors.decompress);
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

        //emitter.emit("order", dupOrder); // broadcast order event
        tracker.add(dupOrder); // add order to queue for broadcast

        state.number += 1;

        /*
          END STATE MODIFICATION
        */

        Logger.logEvent(msg.abci.messages.verified)
        return Vote.valid(dupOrder.id);
      } else {
        Logger.logEvent(msg.abci.messages.noStake)
        return Vote.invalid(msg.abci.messages.noStake);
      }
    } catch (error) {
      console.log(error);
      Logger.logEvent(msg.abci.errors.format);
      return Vote.invalid(msg.abci.errors.format);
    }
  },

  commit: (_) => {
    Logger.logEvent("Round ended, broadcasting orders.");

    try {
      tracker.triggerBroadcast();
    } catch (err) {
      // console.log(err)
      Logger.logError("Error broadcasting TX in commit.")
    }

    return "done" // change to something more meaningful
  }
}

abci(handlers).listen(ABCI_PORT, () => {
  Logger.logEvent(msg.abci.messages.servStart);
  startAPIserver();
});
