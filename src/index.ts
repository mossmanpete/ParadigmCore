/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name index.ts
 * @module src
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  12-September-2018
 * @date (modified) 03-December-2018
 *
 * Startup script for ParadigmCore. Provide configuration through environment.
 */

// Load configuration from environment
require("dotenv").config();

// Standard lib and 3rd party NPM modules
import { EventEmitter } from "events";
import * as tendermint from "../lib/tendermint";

// ParadigmCore classes
import { TxBroadcaster } from "./abci/util/TxBroadcaster";
import { TxGenerator } from "./abci/util/TxGenerator";
import { Logger } from "./util/Logger";
import { messages as msg } from "./util/static/messages";

// State object templates
import { commitState as cState } from "./state/commitState";
import { deliverState as dState } from "./state/deliverState";

// Initialization functions
import { startMain, startRebalancer } from "./abci/main";
import { start as startAPIserver } from "./api/post/HttpServer";
import { start as startStreamServer } from "./api/stream/WsServer";

// Staking contract ABI
import { STAKE_CONTRACT_ABI } from "./util/static/contractABI";

// "Globals"
let emitter: EventEmitter;      // Emitter to track events
let broadcaster: TxBroadcaster; // Internal ABCI transaction broadcaster
let generator: TxGenerator;     // Signs and builds ABCI tx's
let node: any;                  // Tendermint node instance

/**
 * This function executes immediately upon this file being loaded. It is
 * responsible for starting all dependant modules.
 *
 * Provide configuration options via environment (or use .env file)
 *
 * @param env   {object}    environment variables (expected as process.env)
 */
(async (env) => {
    Logger.logStart();

    // Check environment
    Logger.logEvent("Checking environment...");
    if (!env.npm_package_version) {
        Logger.logWarning("Start ParadigmCore using NPM. Exiting.");
        Logger.logError(msg.general.errors.fatal);
        process.exit(1);
    }

    // Configure and start Tendermint core
    Logger.consensus("Starting Tendermint Core...");
    try {
        // Set Tendermint home directory
        const tmHome = `${env.HOME}/.tendermint`;

        // Initialize and start Tendermint
        await tendermint.init(tmHome);
        node = tendermint.node(tmHome, {
            rpc: {
                laddr: `tcp://${env.ABCI_HOST}:${env.ABCI_RPC_PORT}`,
            },
        });
    } catch (error) {
        Logger.consensusErr("failed initializing Tendermint.");
        Logger.logError(msg.general.errors.fatal);
        process.exit(1);
    }

    // Construct local ABCI broadcaster instance
    try {
        broadcaster = new TxBroadcaster({
            client: node.rpc,
        });
    } catch (error) {
        Logger.txErr("failed initializing ABCI connection.");
        Logger.logError(msg.general.errors.fatal);
        process.exit(1);
    }

    // Construct transaction generator instance
    try {
        generator = new TxGenerator({
            encoding: env.SIG_ENC,
            privateKey: env.PRIV_KEY,
            publicKey: env.PUB_KEY,
        });
    } catch (error) {
        Logger.logError("failed to construct TransactionGenerator.");
        Logger.logError(msg.general.errors.fatal);
        process.exit(1);
    }

    // Start WebSocket server
    Logger.websocketEvt("Starting WebSocket server...");
    try {
        // Create a "parent" EventEmitter
        emitter = new EventEmitter();

        // Start OrderStream WebSocket server
        startStreamServer(parseInt(env.WS_PORT, 10), emitter);
    } catch (error) {
        Logger.websocketErr("failed initializing WebSocket server.");
        Logger.logError(msg.general.errors.fatal);
        process.exit(1);
    }

    // Start ABCI application
    try {
        const options = {
            // Transaction broadcaster and emitter instances
            broadcaster,
            emitter,

            // ABCI configuration options
            abciServPort: env.ABCI_PORT,
            commitState: cState,
            deliverState: dState,
            version: env.npm_package_version,

            // Rebalancer options
            finalityThreshold: parseInt(env.FINALITY_THRESHOLD, 10),
            periodLength: parseInt(env.PERIOD_LENGTH, 10),
            periodLimit: parseInt(env.PERIOD_LIMIT, 10),
            provider: env.WEB3_PROVIDER,
            stakeABI: STAKE_CONTRACT_ABI,
            stakeAddress: env.STAKE_CONTRACT_ADDR,
            txGenerator: generator,
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
        Logger.logError(msg.general.errors.fatal);
        process.exit(1);
    }

    // Start HTTP API server
    try {
        Logger.apiEvt("Starting HTTP API server...");
        await startAPIserver(env.API_PORT, broadcaster, generator);
    } catch (error) {
        Logger.apiErr("failed initializing API server.");
        Logger.logError(msg.general.errors.fatal);
        process.exit(1);
    }

    // Indicate block production begins
    Logger.logEvent(msg.general.messages.start);
})(process.env);
