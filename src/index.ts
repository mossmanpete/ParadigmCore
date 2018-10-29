/*
  =========================
  ParadigmCore: Blind Star
  index.ts @ {master}
  =========================

  @date_inital 12 September 2018
  @date_modified 29 October 2018
  @author Henry Harder

  Entry point and startup script for ParadigmCore. 
*/

// Standard lib and 3rd party NPM modules
import * as _ws from "ws";
import * as tendermint from "tendermint-node";
import { EventEmitter } from "events";

// ParadigmCore classes
import { Logger } from "./util/Logger";
import { WebSocketMessage } from "./net/WebSocketMessage";
import { messages as msg } from "./util/messages";

// State object templates
import { deliverState as dState } from "./state/deliverState";
import { commitState as cState} from "./state/commitState";

// Initialization functions
import { startMain, startRebalancer } from "./abci/main";
import { startAPIserver } from "./net/server";

// Configuration and constants
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
    VERSION,
    FINALITY_THRESHOLD
} from "./config";

let wss: _ws.Server;        // OrderStream WS server
let emitter: EventEmitter;  // Emitter to track events
let node: any;              // Tendermint node instance

/**
 * This function executes immediately upon this file being loaded. It is
 * responsible for starting all dependant modules.
 * 
 * Provide configuration options via `config.ts`
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
    } catch (error) {
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
        let options = {
            // ABCI configuration options
            "emitter": emitter,
            "deliverState": dState,
            "commitState": cState,
            "version": VERSION,
            "abciServPort": ABCI_PORT,
        
            // Rebalancer options
            "provider": WEB3_PROVIDER,
            "periodLength": PERIOD_LENGTH,
            "periodLimit": PERIOD_LIMIT,
            "finalityThreshold": FINALITY_THRESHOLD,
            "stakeAddress": STAKE_CONTRACT_ADDR,
            "stakeABI": STAKE_CONTRACT_ABI,
            "abciHost": ABCI_HOST,
            "abciPort": ABCI_RPC_PORT
        }

        // Wait for main process to start
        await startMain(options);
        Logger.consensus("Waiting for Tendermint to synchronize...");

        // Wait for Tendermint to load and synchronize
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