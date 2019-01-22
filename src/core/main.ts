/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name main.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  15-October-2018
 * @date (modified) 21-January-2019
 *
 * ParadigmCore primary state machine, and implementation of Tendermint handler
 * functions and state transition logic.
 */

// 3rd party and STDLIB imports
const abci: any = require("../../lib/js-abci");

// ParadigmCore classes
import { OrderTracker } from "../async/OrderTracker";
import { Witness } from "../async/Witness";
import { Hasher } from "../crypto/Hasher";
import { TxGenerator } from "./util/TxGenerator";
import { Vote } from "./util/Vote";

// Tendermint checkTx/deliverTx handler functions
import { checkOrder, deliverOrder } from "./handlers/order";
import { checkRebalance, deliverRebalance } from "./handlers/rebalance";
import { checkStream, deliverStream } from "./handlers/stream";
import { checkWitness, deliverWitness } from "./handlers/witness";

// General utilities
import { err, log, warn } from "../util/log";
import { bigIntReplacer } from "../util/static/bigIntUtils";
import { messages as templates } from "../util/static/messages";
import { pubToAddr } from "./util/valFunctions";
import { computeConf, decodeTx, preVerifyTx, syncStates } from "./util/utils";

// Custom types
import { 
    ParadigmCoreOptions,
    ResponseEndBlock,
    ResponseInitChain,
    ResponseDeliverTx,
    ResponseCheckTx,
    ResponseCommit,
    ResponseInfo,
    ResponseBeginBlock,
} from "../typings/abci";

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
 *  - options.txGenerator   {TxGenerator}   transaction signer and verification
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

        // Transaction generator/verifier
        let generator = options.txGenerator;

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
            checkTx: checkTxWrapper(cState, templates, generator, Order),
            commit: commitWrapper(dState, cState, tracker, templates, witness),
            deliverTx: deliverTxWrapper(dState, templates, tracker, generator, Order),
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

/*
Below are implementations of Tendermint ABCI handler functions.
*/

/**
 * Return information about the state and software.
 *
 * @param request {RequestInfo}    info request
 */
function infoWrapper(state: State, version: string): (r) => ResponseInfo {
    return (request) => {
        return {
            data: "ParadigmCore (alpha)",
            lastBlockAppHash: state.lastBlockAppHash,
            lastBlockHeight: parseInt(state.lastBlockHeight.toString(), 10),
            version
        };
    };
}



function endBlockWrapper(state: State): (r) => ResponseEndBlock {
    return (r) => {
        // temporary
        console.log(`\n Congrats, you made it to the end of block ${r.height}\n`);
        return {
            validatorUpdates: []
        };
    };
}

/**
 * Persist application state, synchronize commit and deliver states, and
 * trigger the broadcast of valid orders in that block.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function commitWrapper(
    deliverState: State,
    commitState: State,
    tracker: OrderTracker,
    msg: MasterLogTemplates,
    witness: Witness
): () => ResponseCommit {
    return () => {
        // store string encoded state hash
        let stateHash: string = "";

        // perform commit responsibilities
        try {
            // Calculate difference between cState and dState round height
            const roundDiff = deliverState.round.number - commitState.round.number;

            switch (roundDiff) {
                // No rebalance proposal accepted in this round
                case 0: { break; }

                // Rebalance proposal accepted in this round
                case 1: {
                    // Load round parameters from state
                    const newRound = deliverState.round.number;
                    const newStart = deliverState.round.startsAt;
                    const newEnd = deliverState.round.endsAt;

                    // Synchronize staking period parameters
                    witness.synchronize(newRound, newStart, newEnd);

                    // Temporary
                    console.log(`\n... current state: ${JSON.stringify(commitState, bigIntReplacer)}\n`);
                    break;
                }

                default: {
                    // Commit state is more than 1 round ahead of deliver state
                    warn("state", msg.abci.messages.roundDiff);
                    break;
                }
            }

            // Increase last block height
            deliverState.lastBlockHeight += 1n;

            // Generate new state hash and update
            stateHash = Hasher.hashState(deliverState);
            deliverState.lastBlockAppHash = stateHash;

            // Trigger broadcast of orders and streams
            tracker.triggerBroadcast();

            // Synchronize commit state from delivertx state
            syncStates(deliverState, commitState);

            log(
                "state",
                `committing new state with hash: ...${stateHash.slice(-8)}`
            );
        } catch (error) {
            err("state", `${msg.abci.errors.broadcast}: ${error.message}`);
        }

        // Return state's hash to be included in next block header
        return { data: stateHash };
    };
}
