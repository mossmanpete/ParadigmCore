"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  main.ts @ {dev}
  =========================

  @date_inital 13 September 2018
  @date_modified 23 October 2018
  @author Henry Harder

  Main ParadigmCore state machine and state transition logic.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const abci = require("abci");
const messages_1 = require("../util/messages");
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const Hasher_1 = require("../crypto/Hasher");
const Vote_1 = require("../util/Vote");
const Logger_1 = require("../util/Logger");
const OrderTracker_1 = require("../async/OrderTracker");
//import { StakeRebalancer } from "../async/StakeRebalancer";
const newbalancer_1 = require("../async/newbalancer");
const orderHandlers_1 = require("./orderHandlers");
// import { checkStream, deliverStream } from "./streamHandlers";
// import { checkStake, deliverStake } from "./stakeHandlers";
const rebalanceHandlers_1 = require("./rebalanceHandlers");
let version; // store current application version
let handlers; // ABCI handler functions
let tracker; // used to broadcast orders
let rebalancer; // construct and submit mapping
let deliverState; // deliverTx state
let commitState; // commit state
/**
 * @name startMain() {exported async function}
 * @description Initialize and start the ABCI application.
 *
 * @param options {object} options object with parameters:
 *  - options.version       {string}        application version
 *  - options.emitter       {EventEmitter}  main event emitter object
 *  - options.deliverState  {object}        deliverTx state object
 *  - options.commitState   {object}        commit state object
 *  - options.abciServPort  {number}        local ABCI server port
 */
async function startMain(options) {
    try {
        version = options.version;
        deliverState = options.deliverState;
        commitState = options.commitState;
        handlers = {
            info: info,
            beginBlock: beginBlock,
            checkTx: checkTx,
            deliverTx: deliverTx,
            commit: commit
        };
        tracker = new OrderTracker_1.OrderTracker(options.emitter);
        rebalancer = await newbalancer_1.StakeRebalancer.create({
            provider: options.provider,
            periodLength: options.periodLength,
            periodLimit: options.periodLimit,
            stakeAddress: options.stakeAddress,
            stakeABI: options.stakeABI,
            abciHost: options.abciHost,
            abciPort: options.abciPort
        });
        await abci(handlers).listen(options.abciServPort);
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.servStart);
    }
    catch (err) {
        console.log(`(temp5) err: ${err}`);
        throw new Error('Error initializing ABCI application.');
    }
    return;
}
exports.startMain = startMain;
/**
 * @name startRebalancer() {export async function}
 * @description Start rebalancer module and order tracker module.
 *
 * @param none
 */
async function startRebalancer() {
    try {
        let code = rebalancer.start(); // start listening to Ethereum events
        if (code !== 0) {
            Logger_1.Logger.rebalancerErr(`Failed to start rebalancer. Code ${code}`);
            throw new Error();
        }
        tracker.activate(); // start tracking new orders
    }
    catch (err) {
        throw new Error("Error activating stake rebalancer.");
    }
    return;
}
exports.startRebalancer = startRebalancer;
/*
Below are implementations of Tendermint ABCI functions.
*/
/**
 * @name info() {function}
 * @description Return information about the state and software.
 *
 * @param _ {null}
 */
function info(_) {
    return {
        data: 'ParadigmCore ABCI Application',
        version: version,
        lastBlockHeight: commitState.lastBlockHeight,
        lastBlockAppHash: commitState.lastBlockAppHash
    };
}
/**
 * @name beginBlock() {function}
 * @description Called at the begining of each new block. Updates proposer
 * and block height.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function beginBlock(request) {
    let currHeight = request.header.height;
    let currProposer = request.header.proposerAddress.toString('hex');
    // rebalancer.newOrderStreamBlock(currHeight, currProposer);
    Logger_1.Logger.newRound(currHeight, currProposer);
    return {};
}
/**
 * @name checkTx() {function}
 * @description Perform light verification on incoming transactions, accept
 * valid transactions to the mempool, and reject invalid ones.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function checkTx(request) {
    let rawTx = request.tx;
    let tx; // stores decoded transaction object
    let txType; // stores transaction type
    try {
        // TODO: expand ABCIdecode() to produce rich objects
        // decode the buffered and compressed transaction
        tx = PayloadCipher_1.PayloadCipher.ABCIdecode(rawTx);
        txType = tx.type;
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.decompress);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
    }
    /**
     * This main switch block selects the propper handler logic
     * based on the transaction type.
     */
    switch (txType) {
        // TODO: decide if enumerable makes more sence
        case "OrderBroadcast": {
            return orderHandlers_1.checkOrder(tx, commitState);
        }
        /*
        case "StreamBroadcast": {
            return checkStream(tx, commitState);
        }

        case "StakeEvent": {
            return checkStake(tx, commitState);;
        }*/
        case "Rebalance": {
            return rebalanceHandlers_1.checkRebalance(tx, commitState);
        }
        default: {
            // Invalid transaction type
            Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.txType);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.txType);
        }
    }
}
/**
 * @name deliverTx() {function}
 * @description Execute a transaction in full: perform state modification, and
 * verify transaction validity.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function deliverTx(request) {
    let rawTx = request.tx;
    let tx; // stores decoded transaction object
    let txType; // stores transaction type
    try {
        // TODO: expand ABCIdecode() to produce rich objects
        // decode the buffered and compressed transaction
        tx = PayloadCipher_1.PayloadCipher.ABCIdecode(rawTx);
        txType = tx.type;
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.decompress);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
    }
    /**
     * This main switch block selects the propper handler logic
     * based on the transaction type.
     */
    switch (txType) {
        // TODO: decide if enumerable makes more sence
        case "OrderBroadcast": {
            return orderHandlers_1.deliverOrder(tx, deliverState, tracker);
        }
        /*
        case "StreamBroadcast": {
            return deliverStream(tx, deliverState, tracker);
        }

        case "StakeEvent": {
            return deliverStake(tx, deliverState);;
        }*/
        case "Rebalance": {
            return rebalanceHandlers_1.deliverRebalance(tx, deliverState, rebalancer);
        }
        default: {
            // Invalid transaction type
            Logger_1.Logger.consensusWarn(messages_1.messages.abci.errors.txType);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.txType);
        }
    }
}
// TODO: implement endBlock()
/**
 * @name commit() {function}
 * @description Persist application state, synchronize commit and deliver
 * states, and trigger the broadcast of valid orders in that block.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function commit(request) {
    let stateHash = "";
    try {
        // Calculate difference between cState and dState round height
        let roundDiff = deliverState.round.number - commitState.round.number;
        switch (roundDiff) {
            case 0: {
                // No rebalance proposal accepted in this round
                break;
            }
            case 1: {
                // Rebalance proposal accepted in this round
                let newRound = deliverState.round.number;
                let newStart = deliverState.round.startsAt;
                let newEnd = deliverState.round.endsAt;
                rebalancer.synchronize(newRound, newStart, newEnd);
                break;
            }
            default: {
                // Commit state is more than 1 round ahead of deliver state
                Logger_1.Logger.consensusWarn(messages_1.messages.abci.messages.roundDiff);
                break;
            }
        }
        // Increase block height
        deliverState.lastBlockHeight = +1;
        // Synchronize states
        commitState = JSON.parse(JSON.stringify(deliverState));
        // Trigger broadcast of orders and streams
        tracker.triggerBroadcast();
        // Generate new state hash and update
        stateHash = Hasher_1.Hasher.hashState(commitState);
    }
    catch (err) {
        console.log(`(temporary) Error in commit: ${err}`);
        Logger_1.Logger.consensusErr(messages_1.messages.abci.errors.broadcast);
    }
    // Return state's hash to be included in next block header
    return stateHash;
}
