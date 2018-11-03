/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name index.ts
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  12-September-2018
 * @date (modified) 01-November-2018
 *
 * Entry point and startup script for ParadigmCore.
 */

// Load configuration from environment
// tslint:disable-next-line:no-var-requires
require("dotenv").config();

// Standard lib and 3rd party NPM modules
import { EventEmitter } from "events";
import * as _ws from "ws";
import * as tendermint from "../lib/tendermint";

// ParadigmCore classes
import { TxBroadcaster } from "./abci/TxBroadcaster";
import { WebSocketMessage } from "./net/WebSocketMessage";
import { Logger } from "./util/Logger";
import { messages as msg } from "./util/static/messages";

// State object templates
import { commitState as cState } from "./state/commitState";
import { deliverState as dState } from "./state/deliverState";

// Initialization functions
import { startMain, startRebalancer } from "./abci/main";
import { startAPIserver } from "./net/server";

// Staking contract ABI
import { STAKE_CONTRACT_ABI } from "./util/static/contractABI";

// Config and constants from environment
const {
    WS_PORT,
    ABCI_HOST,
    ABCI_RPC_PORT,
    API_PORT,
    WEB3_PROVIDER,
    PERIOD_LENGTH,
    PERIOD_LIMIT,
    STAKE_CONTRACT_ADDR,
    ABCI_PORT,
    VERSION,
    FINALITY_THRESHOLD,
}: any = process.env;

// Tendermint config and storage directory
const TM_HOME = `${process.env.HOME}/.tendermint`;

// "Globals"
let wss: _ws.Server;            // OrderStream WS server
let emitter: EventEmitter;      // Emitter to track events
let broadcaster: TxBroadcaster; // Internal ABCI transaction broadcaster
let node: any;                  // Tendermint node instance

/**
 * This function executes immediately upon this file being loaded. It is
 * responsible for starting all dependant modules.
 *
 * Provide configuration options via `config.ts`
 */
(async () => {
    Logger.logStart();

    // Configure and start Tendermint core
    Logger.consensus("Starting Tendermint Core...");
    try {
        await tendermint.init(TM_HOME);
        node = tendermint.node(TM_HOME, {
            rpc: {
                laddr: `tcp://${ABCI_HOST}:${ABCI_RPC_PORT}`,
            },
        });
    } catch (error) {
        Logger.consensusErr("failed initializing Tendermint.");
        Logger.logError(msg.abci.errors.tmFatal);
        process.exit(1);
    }

    // Construct local ABCI broadcaster instance
    try {
        broadcaster = new TxBroadcaster({
            client: node.rpc,
        });
    } catch (error) {
        Logger.txErr("failed initializing ABCI connection.");
        Logger.logError(msg.abci.errors.tmFatal);
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
        Logger.websocketErr("failed initializing WebSocket server.");
        Logger.logError(msg.websocket.errors.fatal);
        process.exit(1);
    }

    // Start ABCI application
    try {
        const options = {
            // Transaction broadcaster and emitter instances
            broadcaster,
            emitter,

            // ABCI configuration options
            abciServPort: ABCI_PORT,
            commitState: cState,
            deliverState: dState,
            version: VERSION,

            // Rebalancer options
            finalityThreshold: parseInt(FINALITY_THRESHOLD, 10),
            periodLength: parseInt(PERIOD_LENGTH, 10),
            periodLimit: parseInt(PERIOD_LIMIT, 10),
            provider: WEB3_PROVIDER,
            stakeABI: STAKE_CONTRACT_ABI,
            stakeAddress: STAKE_CONTRACT_ADDR,
        };

        // Wait for main ABCI application to start
        await startMain(options);
        Logger.consensus("Waiting for Tendermint to synchronize...");

        // Wait for Tendermint to load and synchronize
        await node.synced();
        Logger.consensus("Tendermint initialized and synchronized.");

        // Activate transaction broadcaster
        broadcaster.start();

        // Start state rebalancer sub-process AFTER sync
        await startRebalancer();
        Logger.rebalancer(msg.rebalancer.messages.activated, 0);
    } catch (error) {
        Logger.consensus("failed initializing ABCI application.");
        Logger.logError(msg.abci.errors.fatal);
        process.exit(1);
    }

    // Start HTTP API server
    try {
        Logger.apiEvt("Starting HTTP API server...");
        await startAPIserver(API_PORT, broadcaster);
    } catch (error) {
        Logger.apiErr("failed initializing API server.");
        Logger.logError(msg.api.errors.fatal);
        process.exit(1);
    }

    /**
     * Begin WebSocket handler implementation (below)
     *
     * TODO: move this to another file
     */

    wss.on("connection", (ws) => {
        try {
            WebSocketMessage.sendMessage(ws, msg.websocket.messages.connected);
        } catch (err) {
            Logger.websocketErr(msg.websocket.errors.connect);
        }

        emitter.on("order", (order) => {
            try {
                wss.clients.forEach((client) => {
                    if ((client.readyState === 1) && (client === ws)) {
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

        ws.on("message", (message) => {
            if (message === "close") {
                return ws.close();
            } else {
                WebSocketMessage.sendMessage(ws, `Unknown command '${message}.'`);
            }
        });
    });

    Logger.logEvent(msg.general.messages.start);
})();
