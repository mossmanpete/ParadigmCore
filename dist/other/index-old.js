/*
  =========================
  ParadigmCore: Blind Star
  index.ts @ {rebalance-refactor}
  =========================

  @date_inital 12 September 2018
  @date_modified 16 October 2018
  @author Henry Harder

  Main ABCI application supporting the OrderStream network.


import * as abci from 'abci';
// import * as tendermint from 'tendermint-node';

import * as _ws from "ws";
import * as _pjs from "paradigm.js";

import { EventEmitter } from "events";
import { startAPIserver } from "./server";
import { state } from "./state";
import { messages as msg } from "./messages"
import { Logger } from "./Logger";
import { Vote } from "./Vote";
import { PayloadCipher } from "./PayloadCipher";
import { WebSocketMessage } from "./WebSocketMessage";
import { Hasher } from './Hasher';
import { OrderTracker } from "./OrderTracker";
import { StakeRebalancer } from './StakeRebalancer';

import {
  ABCI_PORT,
  VERSION,
  WS_PORT,
  WEB3_PROVIDER,
  STAKE_CONTRACT_ADDR,
  STAKE_CONTRACT_ABI,
  PERIOD_LENGTH,
  PERIOD_LIMIT,
  TM_HOME,
  ABCI_HOST,
  ABCI_RPC_PORT
} from "./config";

let paradigm = new _pjs(); // new paradigm instance
let Order = paradigm.Order;
let emitter = new EventEmitter(); // event emitter for WS broadcast
let wss = new _ws.Server({ port: WS_PORT });

let rebalancer;
let node;
let tracker = new OrderTracker(emitter);
let cipher = new PayloadCipher({ inputEncoding: 'utf8', outputEncoding: 'base64' });

wss.on("connection", (ws) => {
  try {
    WebSocketMessage.sendMessage(ws, msg.websocket.messages.connected);
  } catch (err) {
    Logger.websocketErr(msg.websocket.errors.connect);
  }

  emitter.on("order", (order) => {
    try {
      wss.clients.forEach(client => {
        if ((client.readyState === 1) && (client === ws)){
          WebSocketMessage.sendOrder(client, order);
        }
      });
    } catch (err) {
      Logger.websocketErr(msg.websocket.errors.broadcast);
    }
  });

  ws.on('message', (msg) => {
    if(msg === "close") {
      return ws.terminate();
    } else {
      try {
        WebSocketMessage.sendMessage(ws, `Unknown command '${msg}.'`);
      } catch (err) {
        Logger.websocketErr(msg.websocket.errors.message);
      }
    }
  });
});

wss.on('listening', (_) => {
  Logger.websocketEvt(msg.websocket.messages.servStart);
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

  beginBlock: (request) => {
    let currHeight = request.header.height;
    let currProposer = request.header.proposerAddress.toString('hex');

    rebalancer.newOrderStreamBlock(currHeight, currProposer);

    Logger.newRound(currHeight, currProposer);

    return {}
  },

  checkTx: (request) => {
    let txObject;

    try {
      txObject = cipher.ABCIdecode(request.tx);
    } catch (error) {
      Logger.mempoolErr(msg.abci.errors.decompress);
      return Vote.invalid(msg.abci.errors.decompress);
    }

    if(txObject.type === "OrderBroadcast"){
      // tx type is OrderBroadcast

      console.log('we got an order boys')
      try {
        let newOrder = new Order(txObject.data);
        let recoveredAddr = newOrder.recoverPoster();
        if (typeof(recoveredAddr) === "string"){

          Logger.mempool(msg.abci.messages.mempool);
          return Vote.valid(Hasher.hashOrder(newOrder));
        } else {
          Logger.mempool(msg.abci.messages.noStake)
          return Vote.invalid(msg.abci.messages.noStake);
        }
      } catch (error) {
        Logger.mempoolErr(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
      }

    } else if(txObject.type === 'Rebalance'){
      // tx type is Rebalance

      console.log("we got NOT an order");
      return Vote.invalid("not implemented");

    } else {
      // tx type doesn't match OrderBroadcast or Rebalance

      console.log("unknown transaction type");
      return Vote.invalid("not implemented");
    }
  },

  deliverTx: (request) => {
    let txObject;
    
    try {
      txObject = cipher.ABCIdecode(request.tx);
    } catch (error) {
      Logger.consensusErr(msg.abci.errors.decompress)
      return Vote.invalid(msg.abci.errors.decompress);
    }


    if(txObject.type === "OrderBroadcast"){
      // tx type is OrderBroadcast
      
      console.log("orderbroadcast in delivertx");
      try {
        let newOrder = new Order(txObject.data);
        let recoveredAddr = newOrder.recoverPoster();

        if (typeof(recoveredAddr) === "string"){
          
          //  The above conditional shoud rely on a verifyStake(), that checks
          //  the existing state for that address.

          //  BEGIN STATE MODIFICATION
          

          let dupOrder: any = newOrder.toJSON();
          dupOrder.id = Hasher.hashOrder(newOrder);

          //emitter.emit("order", dupOrder); // broadcast order event
          tracker.add(dupOrder); // add order to queue for broadcast

          state.number += 1;

          
          //  END STATE MODIFICATION
          

          Logger.consensus(msg.abci.messages.verified)
          return Vote.valid(dupOrder.id);
        } else {
          Logger.consensus(msg.abci.messages.noStake)
          return Vote.invalid(msg.abci.messages.noStake);
        }
      } catch (error) {
        // console.log(error);
        Logger.consensusErr(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
      }

    } else if(txObject.type === "Rebalance"){
      // tx type is Rebalance

      console.log("we got NOT an order");
      return Vote.invalid("not implemented");
    } else {
      // tx type does not match Rebalance or OrderBroadcast

      console.log("unknown tx type");
      return Vote.invalid("not implemented");
    }
  },

  commit: (_) => {
    try {
      tracker.triggerBroadcast();
    } catch (err) {
      // console.log(err)
      Logger.logError("Error broadcasting TX in commit.")
    }

    return "done" // change to something more meaningful
  }
}

async function start(){
  Logger.logStart();

  rebalancer = await StakeRebalancer.create({
    provider: WEB3_PROVIDER,
    periodLength: PERIOD_LENGTH,
    periodLimit: PERIOD_LIMIT,
    stakeContractAddr: STAKE_CONTRACT_ADDR,
    stakeContractABI: STAKE_CONTRACT_ABI
  })

//  await tendermint.init(TM_HOME);

//  node = tendermint.node(TM_HOME, {
    rpc: {
      laddr: `tcp://${ABCI_HOST}:${ABCI_RPC_PORT}`
    }
  });

  // node.stdout.pipe(process.stdout); // pipe tendermint logs to stdout


  abci(handlers).listen(ABCI_PORT, () => {
    Logger.consensus(msg.abci.messages.servStart);
    startAPIserver();
  });
}

start();
*/
