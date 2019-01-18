/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name index.ts
 * @module src
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  12-September-2018
 * @date (modified) 20-December-2018
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
import { OrderTracker } from "./async/OrderTracker";
import { Witness } from "./async/Witness";
import { TxBroadcaster } from "./core/util/TxBroadcaster";
import { TxGenerator } from "./core/util/TxGenerator";

// State object templates
import { commitState as cState } from "./state/commitState";
import { deliverState as dState } from "./state/deliverState";

// Initialization functions
import { start as startAPIserver } from "./api/post/HttpServer";
import { start as startStreamServer } from "./api/stream/WsServer";
import { start as startMain } from "./core/main";

// General utilities and misc.
import { err, log, logStart, warn } from "./util/log";
import { messages as msg } from "./util/static/messages";

// "Globals"
let witness: Witness;           // implements peg-zone and Ethereum SSM
let emitter: EventEmitter;      // emitter to track order/stream events
let broadcaster: TxBroadcaster; // internal ABCI transaction broadcaster
let generator: TxGenerator;     // signs and builds ABCI tx's
let tracker: OrderTracker;      // uses emitter to track order/stream txs
let web3: Web3;                 // web3 instance
let paradigm;                   // paradigm instance (paradigm-connect)
let node;                       // tendermint node child process instance

/**
 * This function executes immediately upon this file being loaded. It is
 * responsible for starting all dependant modules.
 *
 * Provide configuration options via environment (or use .env file)
 *
 * @param env   {object}    environment variables (expected as process.env)
 */
(async (env) => {
    // welcome :)
    logStart();

    // validate environment
    logStart("checking environment...");
    if (!env.npm_package_version) {
        err("start", "paradigm-core should be started with npm or yarn");
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // tendermint core
    logStart("starting tendermint core...");
    try {
        // todo: define options object
        let options: any  = {
            rpc: {
                laddr: `tcp://${env.ABCI_HOST}:${env.ABCI_RPC_PORT}`,
            },
        };
        if (env.SEEDS !== "" && env.SEEDS !== undefined) {
            options.p2p = {
                seeds: env.SEEDS
            };
        }

        node = tendermint.node(env.TM_HOME, options);
    } catch (error) {
        err("state", "failed starting tendermint.");
        err("state", "tendermint may not be installed or configured.");
        err("state", "use `npm i` to configure tendermint and set up paradigmcore.");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // paradigm-connect and web3
    logStart("setting up paradigm-connect and web3 connection...");
    try {
        web3 = new Web3(env.WEB3_PROVIDER);
        paradigm = new Paradigm({ provider: web3.currentProvider });
    } catch (error) {
        err("state", "failed initializing paradigm-connect");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // local transaction broadcaster
    logStart("setting up validator transaction broadcaster...");
    try {
        broadcaster = new TxBroadcaster({ client: node.rpc });
    } catch (error) {
        err("state", "failed initializing connection to abci server");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // local transaction signer and generator
    logStart("setting up validator transaction signer...");
    try {
        generator = new TxGenerator({
            encoding: env.SIG_ENC,
            privateKey: env.PRIV_KEY,
            publicKey: env.PUB_KEY,
        });
    } catch (error) {
        err("tx", "failed to construct transaction generator");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // order tracker and stream server
    logStart("starting order tracker and websocket server...");
    try {
        // Create a "parent" EventEmitter
        emitter = new EventEmitter();
        tracker = new OrderTracker(emitter);

        // Start OrderStream WebSocket server
        startStreamServer(parseInt(env.WS_PORT, 10), emitter);
    } catch (error) {
        err("api", "failed initializing websocket server.");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // post server
    logStart("starting http api server...");
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

        await startAPIserver(options);
        log("api", msg.api.messages.servStart);
    } catch (error) {
        err("api", "failed initializing api server.");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // create witness (stake-rebalancer)
    logStart("creating witness instance...");
    try {
        const options = {
            // Tx generator/broadcaster
            broadcaster,
            txGenerator: generator,

            // web3 provider url and contract config
            provider: env.WEB3_PROVIDER,

            // consensus params
            finalityThreshold: parseInt(env.FINALITY_THRESHOLD, 10),
            periodLength: parseInt(env.PERIOD_LENGTH, 10),
            periodLimit: parseInt(env.PERIOD_LIMIT, 10),
        };

        witness = await Witness.create(options);
        log("witness", "created new idle witness instance.");
    } catch (error) {
        err("witness", "failed initializing witness component.");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // start main paradigmcore
    logStart("starting paradigmcore...");
    try {
        const options = {
            // Paradigm instance, order tracker, and witness component
            paradigm,
            tracker,
            witness,

            // ABCI configuration options
            abciServPort: parseInt(env.ABCI_PORT, 10),
            commitState: cState,
            deliverState: dState,
            version: env.npm_package_version,

            // Rebalancer and consensus options
            finalityThreshold: parseInt(env.FINALITY_THRESHOLD, 10),
            periodLength: parseInt(env.PERIOD_LENGTH, 10),
            periodLimit: parseInt(env.PERIOD_LIMIT, 10),
            maxOrderBytes: parseInt(env.MAX_ORDER_SIZE, 10),
            txGenerator: generator,
        };

        // Wait for main ABCI application to start
        await startMain(options);
        logStart("waiting for tendermint to synchronize...");

        // Wait for Tendermint to load and synchronize
        await node.synced();
        log("state", "tendermint initialized and synchronized");

        // Activate transaction broadcaster
        log("tx", "starting validator transaction broadcaster...");
        broadcaster.start();

        // activate order tracker
        log("api", "activating order-stream websocket api...");
        tracker.activate();

        // Start state rebalancer sub-process AFTER sync
        log("peg", "starting witness component...");
        if (witness.start() !== 0) { throw Error("failed to start witness."); }
        log("peg", msg.rebalancer.messages.activated);
    } catch (error) {
        err("state", "failed initializing abci application");
        err("start", error.message);
        err("start", msg.general.errors.fatal);
        process.exit(1);
    }

    // Indicate beginning of new block production
    logStart("paradigm-core startup successfully completed");
})(process.env);
