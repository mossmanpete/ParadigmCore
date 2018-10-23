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

import * as Paradigm from "paradigm-connect";
import * as abci from "abci";

import { messages as msg } from "../util/messages";

import { PayloadCipher } from "../crypto/PayloadCipher";
import { Hasher } from "../crypto/Hasher";
import { Vote } from "../util/Vote"
import { Logger } from "../util/Logger";
import { OrderTracker } from "../async/OrderTracker";
import { EventEmitter } from "events";
import { StakeRebalancer } from "../async/StakeRebalancer";

import { checkOrder, deliverOrder } from "./orderHandlers";
// import { checkStream, deliverStream } from "./streamHandlers";
import { checkStake, deliverStake } from "./stakeHandlers";
import { checkRebalance, deliverRebalance } from "./rebalanceHandlers";

let Order = new Paradigm().Order; // Paradigm Order constructor
let handlers: object; // ABCI handler functions

let tracker: OrderTracker; // used to broadcast orders
let rebalancer: StakeRebalancer; // construct and submit mapping
let deliverState: any; // deliverTx state
let commitState: any; // commit state

let version: string; // store current application version

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
export async function startMain(
    port: number,
    dState: any, 
    cState: any, 
    emitter: EventEmitter,
    options: any,
    version: string){

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

        tracker = new OrderTracker(emitter);

        // TODO: pass in options from index.ts
        rebalancer = await StakeRebalancer.create({
          provider: options.provider,
          periodLength: options.periodLength,
          periodLimit: options.periodLimit,
          stakeContractAddr: options.stakeContractAddr,
          stakeContractABI: options.stakeContractABI,
          tendermintRpcHost: options.tendermintRpcHost,
          tendermintRpcPort: options.tendermintRpcPort
        });

        await abci(handlers).listen(port);
        Logger.consensus(msg.abci.messages.servStart);

    } catch (err) {
      throw new Error('Error initializing ABCI application.');
    }
    return;
}

/**
 * @name startRebalancer() {export async function}
 * @description Start rebalancer module and order tracker module.
 * 
 * @param none
 */
export async function startRebalancer() {
  try {
    rebalancer.start(); // start listening to Ethereum events
    tracker.activate(); // start tracking new orders
  } catch (err) {
    throw new Error("Error activating stake rebalancer.");
  }
  return;
}

/*
Below are implementations of Tendermint ABCI functions.
*/

/**
 * @name info() {function}
 * @description Return information about the state and software.
 * 
 * @param _ {null}
 */
function info(_){
    return {
        data: 'ParadigmCore ABCI Application',
        version: version,
        lastBlockHeight: commitState.lastBlockHeight,
        lastBlockAppHash: commitState.lastBlockAppHash
    }
}

/**
 * @name beginBlock() {function}
 * @description Called at the begining of each new block. Updates proposer
 * and block height.
 * 
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function beginBlock(request){
    let currHeight = request.header.height;
    let currProposer = request.header.proposerAddress.toString('hex');

    // rebalancer.newOrderStreamBlock(currHeight, currProposer);

    Logger.newRound(currHeight, currProposer);
    return {};
}

/**
 * @name checkTx() {function}
 * @description Perform light verification on incoming transactions, accept
 * valid transactions to the mempool, and reject invalid ones.
 * 
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function checkTx(request){
    let rawTx: Buffer = request.tx;

    let tx: any; // stores decoded transaction object
    let txType: string; // stores transaction type

    try {
        // TODO: expand ABCIdecode() to produce rich objects
        
        // decode the buffered and compressed transaction
        tx = PayloadCipher.ABCIdecode(rawTx);
        txType = tx.type;
    } catch (err) {
        Logger.mempoolWarn(msg.abci.errors.decompress);
        return Vote.invalid(msg.abci.errors.decompress);
    }

    /**
     * This main switch block selects the propper handler logic
     * based on the transaction type.
     */
    switch (txType) {
        // TODO: decide if enumerable makes more sence

        case "OrderBroadcast": {
            return checkOrder(tx, deliverState);
        }
        /*
        case "StreamBroadcast": {
            return checkStream(tx, deliverState);
        }*/

        case "StakeEvent": {
            return checkStake(tx, deliverState);;
        }

        case "Rebalance": {
            return checkRebalance(tx, deliverState);
        }

        default: {
            Logger.mempoolWarn("Invalid transaction type rejected.");
            return Vote.invalid("Invalid transaction type rejected.");
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
function deliverTx(request){
    let rawTx: Buffer = request.tx;

    let tx: any; // stores decoded transaction object
    let txType: string; // stores transaction type

    try {
        // TODO: expand ABCIdecode() to produce rich objects
        
        // decode the buffered and compressed transaction
        tx = PayloadCipher.ABCIdecode(rawTx);
        txType = tx.type;
    } catch (err) {
        Logger.mempoolWarn(msg.abci.errors.decompress);
        return Vote.invalid(msg.abci.errors.decompress);
    }

    /**
     * This main switch block selects the propper handler logic
     * based on the transaction type.
     */
    switch (txType) {
        // TODO: decide if enumerable makes more sence

        case "OrderBroadcast": {
            return deliverOrder(tx, deliverState, tracker);
        }
        /*
        case "StreamBroadcast": {
            return deliverStream(tx, deliverState, tracker);
        }*/

        case "StakeEvent": {
            return deliverStake(tx, deliverState);;
        }

        case "Rebalance": {
            return deliverRebalance(tx, deliverState);
        }

        default: {
            Logger.consensusWarn("Invalid transaction type rejected.");
            return Vote.invalid("Invalid transaction type rejected.");
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
function commit(request){
    return;
}