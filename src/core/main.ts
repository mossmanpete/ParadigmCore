/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name main.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  15-October-2018
 * @date (modified) 22-January-2019
 *
 * ParadigmCore primary state machine (via imported handlers) and ABCI
 * application.
*/

// 3rd party and STDLIB imports
const abci: any = require("../../lib/js-abci");

// general utilities
import { log } from "../util/log";
import { messages as templates } from "../util/static/messages";

// abci handler implementatinos
import { beginBlockWrapper } from "./beginBlock";
import { checkTxWrapper } from "./checkTx";
import { deliverTxWrapper } from "./deliverTx";
import { initChainWrapper } from "./initChain";
import { commitWrapper } from "./commit";
import { infoWrapper } from "./info";
import { endBlockWrapper } from "./endBlock";

// custom types
import { ParadigmCoreOptions } from "src/typings/abci";

/**
 * Initialize and start the ABCI application.
 *
 * @param options {object} Options object with parameters:
 *  - options.version       {string}        paradigmcore version string
 *  - options.tracker       {OrderTracker}  tracks valid orders
 *  - options.witness       {Witness}       witness instance (tracks Ethereum)
 *  - options.deliverState  {object}        deliverTx state object
 *  - options.commitState   {object}        commit state object
 *  - options.abciServPort  {number}        local ABCI server port
 *  - options.finalityThreshold {number}    Ethereum block finality threshold
 *  - options.maxOrderBytes {number}        maximum order size in bytes
 *  - options.periodLength  {number}        length of rebalance period
 *  - options.periodLimit   {number}        transactions accepted per period
 *  - options.paradigm      {Paradigm}      paradigm-connect instance
 */
export async function start(options: ParadigmCoreOptions): Promise<null> {
    try {
        // Set application version
        let version = options.version;

        // Load paradigm Order constructor
        let Order = options.paradigm.Order;

        // Load state objects
        let dState = options.deliverState;
        let cState = options.commitState;

        // Queue for valid broadcast transactions (order/stream)
        let tracker = options.tracker;

        // witness instance
        let witness = options.witness;

        // Load initial consensus params
        let consensusParams: ConsensusParams = {
            finalityThreshold: options.finalityThreshold,
            periodLength: options.periodLength,
            periodLimit: options.periodLimit,
            maxOrderBytes: options.maxOrderBytes
        };

        // Establish ABCI handler functions
        let handlers = {
            beginBlock: beginBlockWrapper(dState),
            checkTx: checkTxWrapper(cState, templates, Order),
            commit: commitWrapper(dState, cState, tracker, templates, witness),
            deliverTx: deliverTxWrapper(dState, templates, tracker, Order),
            info: infoWrapper(cState, version),
            initChain: initChainWrapper(dState, cState, consensusParams),
            endBlock: endBlockWrapper(dState)
        };

        // Start ABCI server (connection to Tendermint core)
        await abci(handlers).listen(options.abciServPort);
        log("state", templates.abci.messages.servStart);
    } catch (error) {
        throw new Error(`initializing abci application: ${error.message}`);
    }
    return;
}