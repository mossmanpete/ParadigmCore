/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name index.ts
 * @module src
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  12-September-2018
 * @date (modified) 17-December-2018
 *
 * Startup script for ParadigmCore. Provide configuration through environment.
 */

// Load configuration from environment
require("dotenv").config();

// ParadigmConnect protocol driver and library
import * as Paradigm from "paradigm-connect";

// Standard lib and 3rd party NPM modules
import { EventEmitter } from "events";
import Web3 = require("web3");
import * as tendermint from "../lib/tendermint";

// ParadigmCore classes
import { TxBroadcaster } from "./abci/util/TxBroadcaster";
import { TxGenerator } from "./abci/util/TxGenerator";
import { err, log, logStart, warn } from "./util/log";
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
let web3;
let paradigm;

/**
 * This function executes immediately upon this file being loaded. It is
 * responsible for starting all dependant modules.
 *
 * Provide configuration options via environment (or use .env file)
 *
 * @param env   {object}    environment variables (expected as process.env)
 */
(async (env) => {
    // check environment
    logStart("checking environment...");
    if (!env.npm_package_version) {
        err("start", "paradigm-core must be started with npm or yarn");
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    logStart();

    // Configure and start Tendermint core
    logStart("starting tendermint core...");
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
        err("start", "failed initializing tendermint");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // Construct local web3/Paradigm instance
    try {
        web3 = new Web3(env.WEB3_PROVIDER);
        paradigm = new Paradigm({ provider: web3.currentProvider });
    } catch (error) {
        err("start", "failed initializing paradigm-connect");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // Construct local ABCI broadcaster instance
    try {
        broadcaster = new TxBroadcaster({ client: node.rpc });
    } catch (error) {
        err("start", "failed initializing connection to state machine");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
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
        err("start", "failed to construct transaction generator");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // Start WebSocket server
    logStart("starting websocket server...");
    try {
        // Create a "parent" EventEmitter
        emitter = new EventEmitter();

        // Start OrderStream WebSocket server
        startStreamServer(parseInt(env.WS_PORT, 10), emitter);
    } catch (error) {
        err("start", "failed initializing websocket server.");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // Start ABCI application
    try {
        const options = {
            // Paradigm instance
            paradigm,

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
        logStart("waiting for tendermint to synchronize...");

        // Wait for Tendermint to load and synchronize
        await node.synced();
        logStart("tendermint initialized and synchronized");

        // Activate transaction broadcaster
        broadcaster.start();

        // Start state rebalancer sub-process AFTER sync
        await startRebalancer();
        logStart(msg.rebalancer.messages.activated);
    } catch (error) {
        err("start", "failed initializing abci application");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // Start HTTP API server
    try {
        const options = {
            // Paradigm instance
            paradigm,

            // Tx generator/broadcaster
            broadcaster, generator,

            // Rate limiter config
            rateWindow: parseInt(env.WINDOW_MS, 10),
            rateMax: parseInt(env.WINDOW_MAX, 10),

            // API bind port (HTTP)
            port: parseInt(env.API_PORT, 10)
        };

        logStart("starting http api server...");
        await startAPIserver(options);
    } catch (error) {
        err("start", "failed initializing api server.");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // Indicate beginning of new block production
    logStart(msg.general.messages.start);
})(process.env);
