/* 
  =========================
  ParadigmCore: Blind Star
  index.ts @ {rebalance-refactor}
  =========================

  @date_inital 12 September 2018
  @date_modified 17 October 2018
  @author Henry Harder

  Entry point and startup script for ParadigmCore. 
*/

import * as _ws from "ws";
import * as tendermint from "tendermint-node";

import { Logger } from "./util/Logger";
import { WebSocketMessage } from "./net/WebSocketMessage";
import { messages as msg } from "./util/messages";
import { EventEmitter } from "events";

import { state } from "./state/state";
import { start } from "./abci/handlers";
import { startAPIserver } from "./net/server";

import { WS_PORT, TM_HOME, ABCI_HOST, ABCI_RPC_PORT } from "./config";

let wss: _ws.Server;
let emitter: EventEmitter;
let node: any; // Tendermint node instance

(async function() {
    Logger.logStart();

    // Configure and start Tendermint core
    Logger.consensus("Starting Tendermint Core...");
    try {
        await tendermint.init(TM_HOME);
        node = tendermint.node(TM_HOME, {
            rpc: {
                laddr: `tcp://${ABCI_HOST}:${ABCI_RPC_PORT}`
            }
        });
    } catch (error) {
        Logger.consensusErr("Fatal error starting Tendermint core.");
        process.exit();
    }

    // Start WebSocket server
    Logger.websocketEvt("Starting WebSocket server...");
    try {
        wss = new _ws.Server({ port: WS_PORT }, () => {
            Logger.websocketEvt(msg.websocket.messages.servStart);
        });
        emitter = new EventEmitter();
    } catch (error) {
        Logger.websocketErr("Fatal error starting WebSocket server.");
        process.exit();
    }

    // Start HTTP API server
    Logger.apiEvt("Starting HTTP API server...");
    try {
        startAPIserver();
    } catch (error) {
        Logger.apiErr('Fatal error starting API server.')
        process.exit();
    }

    // Start ABCI application
    let code = await start(emitter, state);

    if(code != 0){
        Logger.logError("Fatal error initializing application.")
        process.exit();
    }

    /**
     * Begin WebSocket handler implementation (below)
     */

    //wss.on("listening", (_) => {
    //    console.log('hola');
    //    Logger.websocketEvt(msg.websocket.messages.servStart);
    //});

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
        
        ws.on('message', (message) => {
            if(message === "close") { 
                return ws.terminate();
            } else {
                try {
                    WebSocketMessage.sendMessage(ws, `Unknown command '${message}.'`);
                } catch (err) {
                    Logger.websocketErr(msg.websocket.errors.message);
                }
            }
        });
    });

    Logger.logEvent("Initialization complete.");
})();