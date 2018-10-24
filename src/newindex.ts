/*
  =========================
  ParadigmCore: Blind Star
  index.ts @ {master}
  =========================

  @date_inital 12 September 2018
  @date_modified 19 October 2018
  @author Henry Harder

  Entry point and startup script for ParadigmCore. 
*/

import * as _ws from "ws";
import * as tendermint from "tendermint-node";

import { Logger } from "./util/Logger";
import { WebSocketMessage } from "./net/WebSocketMessage";
import { messages as msg } from "./util/messages";
import { EventEmitter } from "events";

import { deliverState as dState } from "./state/deliverState";
import { commitState as cState} from "./state/commitState";

import { startMain, startRebalancer } from "./abci/main";
import { startAPIserver } from "./net/server";

import { 
    WS_PORT,
    TM_HOME, 
    ABCI_HOST, 
    ABCI_RPC_PORT, 
    API_PORT, 
    WEB3_PROVIDER, 
    PERIOD_LENGTH, 
    PERIOD_LIMIT, 
    STAKE_CONTRACT_ADDR, 
    STAKE_CONTRACT_ABI, 
    ABCI_PORT,
    VERSION
} from "./config";


let wss: _ws.Server;
let emitter: EventEmitter;
let node: any; // Tendermint node instance

/**
 * This function executes immediately upon this file being executed. It is
 * responsible for starting all dependant modules.
 */
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

        // node.stdout.pipe(process.stdout); // pipe tendermint logs to STDOUT

    } catch (error) {
        console.log(error);
        Logger.consensusErr(msg.abci.errors.tmFatal);
        process.exit(1);
    }

    // Start WebSocket server
    Logger.websocketEvt("Starting WebSocket server...");
    try {
        wss = new _ws.Server({ port: WS_PORT }, () => {
            Logger.websocketEvt(msg.websocket.messages.servStart);
        });
        emitter = new EventEmitter(); // parent event emitter
    } catch (error) {
        Logger.websocketErr(msg.websocket.errors.fatal);
        process.exit(1);
    }

    // Start ABCI application
    try{
        // ABCI configuration options
        let options = {
            "abciPort": ABCI_PORT,
            "version": VERSION,
            "deliverState": dState,
            "commitState": cState,
            "emitter": emitter,

            // Rebalancer options
            "provider": WEB3_PROVIDER,
            "periodLength": PERIOD_LENGTH,
            "periodLimit": PERIOD_LIMIT,
            "stakeContractAddr": STAKE_CONTRACT_ADDR,
            "stakeContractABI": STAKE_CONTRACT_ABI,
            "tendermintRpcHost": ABCI_HOST,
            "tendermintRpcPort": ABCI_RPC_PORT
        }

        // TODO: convert to options object
        await startMain(options);
        Logger.consensus("Waiting for Tendermint to synchronize...");

        await node.synced();
        Logger.consensus("Tendermint initialized and syncronized.");

        // Start state rebalancer sub-process AFTER sync
        await startRebalancer();
        Logger.rebalancer(msg.rebalancer.messages.activated, 0);
    } catch (error) {
        Logger.logError(msg.abci.errors.fatal);
        process.exit(1);
    }

    // Start HTTP API server
    try {
        Logger.apiEvt("Starting HTTP API server...");
        await startAPIserver(ABCI_HOST, ABCI_RPC_PORT, API_PORT);
    } catch (error) {
        Logger.apiErr(msg.api.errors.fatal)
        process.exit(1);
    }

    /**
     * Begin WebSocket handler implementation (below)
     * 
     * TODO: move this to another file
     */

    wss.on("connection", ws => {
        try {
            WebSocketMessage.sendMessage(ws, msg.websocket.messages.connected);
        } catch (err) {
            Logger.websocketErr(msg.websocket.errors.connect);
        }
    
        emitter.on("order", order => {
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

        /*emitter.on("stream", stream => {
            try {
                wss.clients.forEach(client => {
                    if ((client.readyState === 1) && (client === ws)){
                        WebSocketMessage.sendStream(client, stream);
                    }
                });
            } catch (err) {
                Logger.websocketErr(msg.websocket.errors.broadcast);
            }
        });*/
        
        ws.on('message', message => {
            if(message === "close") { 
                return ws.close();
            } else {
                WebSocketMessage.sendMessage(ws, `Unknown command '${message}.'`);
            }
        });
    });

    Logger.logEvent(msg.general.messages.start);
})();