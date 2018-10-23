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
const Paradigm = require("paradigm-connect");
const abci = require("abci");
const messages_1 = require("../util/messages");
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const Vote_1 = require("../util/Vote");
const Logger_1 = require("../util/Logger");
const OrderTracker_1 = require("../async/OrderTracker");
const StakeRebalancer_1 = require("../async/StakeRebalancer");
const orderHandlers_1 = require("./orderHandlers");
// import { checkStream, deliverStream } from "./streamHandlers";
const stakeHandlers_1 = require("./stakeHandlers");
const rebalanceHandlers_1 = require("./rebalanceHandlers");
let Order = new Paradigm().Order; // Paradigm Order constructor
let handlers; // ABCI handler functions
let tracker; // used to broadcast orders
let rebalancer; // construct and submit mapping
let deliverState; // deliverTx state
let commitState; // commit state
let version; // store current application version
/**
 * @name startMain() {exported async function}
 * @description Initialize and start the ABCI application.
 *
 * @param port {number} port to launch ABCI server on
 * @param dState {object} deliverTx state (modified within rounds)
 * @param cState {object} commit state (updated at the end of each round)
 * @param emitter {EventEmitter} emitter to attach to OrderTracker
 * @param options {object} configuration options for the rebalancer
 * @param version {string} current application version
 */
async function startMain(port, dState, cState, emitter, options, version) {
    try {
        deliverState = dState;
        commitState = cState;
        handlers = {
            info: info,
            beginBlock: beginBlock,
            checkTx: checkTx,
            deliverTx: deliverTx,
            commit: commit
        };
        tracker = new OrderTracker_1.OrderTracker(emitter);
        // TODO: pass in options from index.ts
        rebalancer = await StakeRebalancer_1.StakeRebalancer.create({
            provider: options.provider,
            periodLength: options.periodLength,
            periodLimit: options.periodLimit,
            stakeContractAddr: options.stakeContractAddr,
            stakeContractABI: options.stakeContractABI,
            tendermintRpcHost: options.tendermintRpcHost,
            tendermintRpcPort: options.tendermintRpcPort
        });
        await abci(handlers).listen(port);
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.servStart);
    }
    catch (err) {
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
        rebalancer.start(); // start listening to Ethereum events
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
            return orderHandlers_1.checkOrder(tx, deliverState);
        }
        /*
        case "StreamBroadcast": {
            return checkStream(tx, deliverState);
        }*/
        case "StakeEvent": {
            return stakeHandlers_1.checkStake(tx, deliverState);
            ;
        }
        case "Rebalance": {
            return rebalanceHandlers_1.checkRebalance(tx, deliverState);
        }
        default: {
            Logger_1.Logger.mempoolWarn("Invalid transaction type rejected.");
            return Vote_1.Vote.invalid("Invalid transaction type rejected.");
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
        }*/
        case "StakeEvent": {
            return stakeHandlers_1.deliverStake(tx, deliverState);
            ;
        }
        case "Rebalance": {
            return rebalanceHandlers_1.deliverRebalance(tx, deliverState);
        }
        default: {
            Logger_1.Logger.consensusWarn("Invalid transaction type rejected.");
            return Vote_1.Vote.invalid("Invalid transaction type rejected.");
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
    return;
}
