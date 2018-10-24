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
// import { checkStake, deliverStake } from "./stakeHandlers";
import { checkRebalance, deliverRebalance } from "./rebalanceHandlers";

let version: string; // store current application version
let handlers: object; // ABCI handler functions

let tracker: OrderTracker; // used to broadcast orders
let rebalancer: StakeRebalancer; // construct and submit mapping

let deliverState: any; // deliverTx state
let commitState: any; // commit state

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
export async function startMain(options: any): Promise<null> {

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

        tracker = new OrderTracker(options.emitter);

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

        await abci(handlers).listen(options.abciPort);
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
export async function startRebalancer(): Promise<null> {
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
function info(_): object {
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
function beginBlock(request): object {
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
function checkTx(request): Vote {
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
            return checkOrder(tx, commitState);
        }
        /*
        case "StreamBroadcast": {
            return checkStream(tx, commitState);
        }

        case "StakeEvent": {
            return checkStake(tx, commitState);;
        }*/

        case "Rebalance": {
            return checkRebalance(tx, commitState);
        }

        default: {
            // Invalid transaction type
            Logger.mempoolWarn(msg.abci.errors.txType);
            return Vote.invalid(msg.abci.errors.txType);
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
function deliverTx(request): Vote {
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
        }

        case "StakeEvent": {
            return deliverStake(tx, deliverState);;
        }*/

        case "Rebalance": {
            return deliverRebalance(tx, deliverState, rebalancer);
        }

        default: {
            // Invalid transaction type
            Logger.consensusWarn(msg.abci.errors.txType);
            return Vote.invalid(msg.abci.errors.txType);
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
function commit(request): string {
    let stateHash: string = "";

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
                Logger.consensusWarn(msg.abci.messages.roundDiff);
                break;
            }
        }

        // Increase block height
        deliverState.lastBlockHeight =+ 1;

        // Synchronize states
        commitState = JSON.parse(JSON.stringify(deliverState));

        // Trigger broadcast of orders and streams
        tracker.triggerBroadcast();

        // Generate new state hash and update
        stateHash = Hasher.hashState(commitState);
    } catch (err) {
        console.log(`(temporary) Error in commit: ${err}`);
        Logger.consensusErr(msg.abci.errors.broadcast);
    }

    // Return state's hash to be included in next block header
    return stateHash;
}