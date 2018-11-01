"use strict";
/**
  =========================
  ParadigmCore: Blind Star
  main.ts @ {master}
  =========================

  @date_initial 13 September 2018
  @date_modified 1 November 2018
  @author Henry Harder

  Main ParadigmCore state machine and state transition logic.
*/
Object.defineProperty(exports, "__esModule", { value: true });
// Tendermint JS ABCI server 
const abci = require('abci');
// Log message templates
const messages_1 = require("../util/static/messages");
// Custom classes
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const Hasher_1 = require("../crypto/Hasher");
const Vote_1 = require("./Vote");
const Logger_1 = require("../util/Logger");
const OrderTracker_1 = require("../async/OrderTracker");
const StakeRebalancer_1 = require("../async/StakeRebalancer");
// ABCI handler functions
const order_1 = require("./handlers/order");
const witness_1 = require("./handlers/witness");
const rebalance_1 = require("./handlers/rebalance");
const Transaction_1 = require("./Transaction");
// "Globals"
let version; // store current application version
let handlers; // ABCI handler functions
// Asynchronous modules
let tracker; // Wsed to broadcast valid orders
let rebalancer; // Witness component
// State objects
let deliverState; // deliverTx state
let commitState; // commit state
/**
 * Initialize and start the ABCI application.
 *
 * @param options {object} Options object with parameters:
 *  - options.version       {string}        application version
 *  - options.emitter       {EventEmitter}  main event emitter object
 *  - options.deliverState  {object}        deliverTx state object
 *  - options.commitState   {object}        commit state object
 *  - options.abciServPort  {number}        local ABCI server port
 */
async function startMain(options) {
    try {
        version = options.version;
        // Load state objects
        deliverState = options.deliverState;
        commitState = options.commitState;
        // Establish ABCI handler functions
        handlers = {
            info: info,
            beginBlock: beginBlock,
            checkTx: checkTx,
            deliverTx: deliverTx,
            commit: commit
        };
        // Queue for valid broadcast transactions (order/stream)
        tracker = new OrderTracker_1.OrderTracker(options.emitter);
        // Configure StakeRebalancer module
        rebalancer = await StakeRebalancer_1.StakeRebalancer.create({
            provider: options.provider,
            periodLength: options.periodLength,
            periodLimit: options.periodLimit,
            finalityThreshold: options.finalityThreshold,
            stakeAddress: options.stakeAddress,
            stakeABI: options.stakeABI,
            broadcaster: options.broadcaster
        });
        // Start ABCI server (connection to Tendermint core)
        await abci(handlers).listen(options.abciServPort);
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.servStart);
    }
    catch (err) {
        throw new Error('Error initializing ABCI application.');
    }
    return;
}
exports.startMain = startMain;
/**
 * Start rebalancer module and order tracker module.
 */
async function startRebalancer() {
    try {
        // Start rebalancer after sync
        let code = rebalancer.start(); // start listening to Ethereum event
        if (code !== 0) {
            Logger_1.Logger.rebalancerErr(`Failed to start rebalancer. Code ${code}`);
            throw new Error();
        }
        // Activate OrderTracker (after Tendermint sync)
        tracker.activate();
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
 * Return information about the state and software.
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
 * Called at the begining of each new block. Updates proposer and block height.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function beginBlock(request) {
    let currHeight = request.header.height;
    let currProposer = request.header.proposerAddress.toString('hex');
    Logger_1.Logger.newRound(currHeight, currProposer);
    return {};
}
/**
 * Perform light verification on incoming transactions, accept valid
 * transactions to the mempool, and reject invalid ones.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function checkTx(request) {
    // Raw transaction buffer (encoded and compressed)
    let rawTx = request.tx;
    let tx; // Stores decoded transaction object
    let txType; // Stores transaction type
    let sigOk; // True if signature is valid
    // Decode the buffered and compressed transaction
    try {
        tx = PayloadCipher_1.PayloadCipher.ABCIdecode(rawTx);
        txType = tx.type.toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.decompress);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
    }
    // Verify validator signature
    // @TODO: add condition to check sig is from a validator
    try {
        sigOk = Transaction_1.Transaction.verify(tx);
        if (!sigOk) {
            Logger_1.Logger.mempoolWarn("Rejected ABCI transaction with invalid signature.");
            return Vote_1.Vote.invalid("Invalid validator signature.");
        }
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn("Unable to recover validator signature.");
        return Vote_1.Vote.invalid("Error encountered recovering validator signature.");
    }
    /**
     * This main switch block selects the propper handler logic
     * based on the transaction type.
     */
    switch (txType) {
        case "order": {
            return order_1.checkOrder(tx, commitState);
        }
        /*
        case "stream": {
            return checkStream(tx, commitState);
        }*/
        case "witness": {
            return witness_1.checkWitness(tx, commitState);
            ;
        }
        case "rebalance": {
            return rebalance_1.checkRebalance(tx, commitState);
        }
        default: {
            // Invalid transaction type
            Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.txType);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.txType);
        }
    }
}
/**
 * Execute a transaction in full: perform state modification, and verify
 * transaction validity.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function deliverTx(request) {
    // Raw transaction buffer (encoded and compressed)
    let rawTx = request.tx;
    let tx; // Stores decoded transaction object
    let txType; // Stores transaction type
    let sigOk; // True if signature is valid
    // Decode the buffered and compressed transaction
    try {
        tx = PayloadCipher_1.PayloadCipher.ABCIdecode(rawTx);
        txType = tx.type.toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.decompress);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
    }
    // Verify validator signature
    // @TODO: add condition to check sig is from a validator
    try {
        sigOk = Transaction_1.Transaction.verify(tx);
        if (!sigOk) {
            Logger_1.Logger.mempoolWarn("Rejected ABCI transaction with invalid signature.");
            return Vote_1.Vote.invalid("Invalid validator signature.");
        }
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn("Unable to recover validator signature.");
        return Vote_1.Vote.invalid("Error encountered recovering validator signature.");
    }
    /**
     * This main switch block selects the propper handler logic
     * based on the transaction type.
     */
    switch (txType) {
        case "order": {
            return order_1.deliverOrder(tx, deliverState, tracker);
        }
        /*
        case "stream": {
            return deliverStream(tx, deliverState, tracker);
        }*/
        case "witness": {
            return witness_1.deliverWitness(tx, deliverState);
            ;
        }
        case "rebalance": {
            return rebalance_1.deliverRebalance(tx, deliverState, rebalancer);
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
 * Persist application state, synchronize commit and deliver states, and
 * trigger the broadcast of valid orders in that block.
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
                // Load round parameters from state
                let newRound = deliverState.round.number;
                let newStart = deliverState.round.startsAt;
                let newEnd = deliverState.round.endsAt;
                // Synchronize staking period parameters
                rebalancer.synchronize(newRound, newStart, newEnd);
                break;
            }
            default: {
                // Commit state is more than 1 round ahead of deliver state
                Logger_1.Logger.consensusWarn(messages_1.messages.abci.messages.roundDiff);
                break;
            }
        }
        // Increase last block height
        deliverState.lastBlockHeight += 1;
        // Generate new state hash and update
        stateHash = Hasher_1.Hasher.hashState(deliverState);
        deliverState.lastBlockAppHash = stateHash;
        // Trigger broadcast of orders and streams
        tracker.triggerBroadcast();
        // Synchronize commit state from delivertx state
        // @TODO: find a better way to deep-clone the state object
        commitState = JSON.parse(JSON.stringify(deliverState));
        Logger_1.Logger.consensus(`Commit and broadcast complete. Current state hash: ${stateHash}`);
    }
    catch (err) {
        Logger_1.Logger.consensusErr(messages_1.messages.abci.errors.broadcast);
    }
    // Temporary
    console.log(`\n... Current state: ${JSON.stringify(commitState)}\n`);
    // Return state's hash to be included in next block header
    return stateHash;
}
