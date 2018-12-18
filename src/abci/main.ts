/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name main.ts
 * @module src/abci
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  15-October-2018
 * @date (modified) 04-December-2018
 *
 * ParadigmCore primary state machine, and implementation of Tendermint handler
 * functions and state transition logic.
 */

// 3rd party and STDLIB imports
// const abci: any = require("abci");
const abci: any = require("../../lib/js-abci");
import { cloneDeep } from "lodash";

// ParadigmCore classes
import { OrderTracker } from "../async/OrderTracker";
import { StakeRebalancer } from "../async/StakeRebalancer";
import { Hasher } from "../crypto/Hasher";
import { PayloadCipher } from "../crypto/PayloadCipher";
// import { Logger as log } from "../util/Logger";
import { TxGenerator } from "./util/TxGenerator";
import { Vote } from "./util/Vote";

// New logger
import { err, log, logStart, warn } from "../util/log";

// Tendermint checkTx/deliverTx handler functions
import { checkOrder, deliverOrder } from "./handlers/order";
import { checkRebalance, deliverRebalance } from "./handlers/rebalance";
import { checkStream, deliverStream } from "./handlers/stream";
import { checkWitness, deliverWitness } from "./handlers/witness";

// General utilities
import { bigIntReplacer } from "../util/static/bigIntUtils";
import { messages as msg } from "../util/static/messages";
import { pubToAddr } from "../util/static/valFunctions";
import { decodeTx, preVerifyTx } from "./util/utils";

// "Globals" (used across modules)
let version: string;        // Stores current application version
let handlers: object;       // ABCI handler functions
let generator: TxGenerator; // Used to verify transaction signatures

// Asynchronous modules
let tracker: OrderTracker;          // Used to broadcast valid orders
let rebalancer: StakeRebalancer;    // Witness component

// State objects
let deliverState: any;  // deliverTx state (modified during block execution)
let commitState: any;   // commit state (synchronized at the end of each block)

// Paradigm instance
let paradigm: any;

/**
 * Initialize and start the ABCI application.
 *
 * @param options {object} Options object with parameters:
 *  - options.emitter       {EventEmitter}  main event emitter object
 *  - options.deliverState  {object}        deliverTx state object
 *  - options.commitState   {object}        commit state object
 *  - options.abciServPort  {number}        local ABCI server port
 *  - options.txGenerator   {TxGenerator}   transaction signer and verification
 *  - options.broadcaster   {TxBroadcaster} deliver transactions to tendermint
 *  - options.finalityThreshold {number}    Ethereum block finality threshold
 *  - options.periodLength  {number}        length of rebalance period
 *  - options.periodLimit   {number}        transactions accepted per period
 *  - options.provider      {string}        web3 provider URI (use websocket)
 *  - options.stakeABI      {array/JSON}    Ethereum staking contract ABI
 *  - options.stakeAddress  {string}        Ethereum staking contract address
 *  - options.paradigm      {Paradigm}      paradigm-connect instance
 */
export async function startMain(options: any): Promise<null> {
    try {
        // Set application version
        version = options.version;

        // Load paradigm object
        paradigm = options.paradigm;

        // Load state objects
        deliverState = options.deliverState;
        commitState = options.commitState;

        // Establish ABCI handler functions
        handlers = {
            beginBlock,
            checkTx,
            commit,
            deliverTx,
            info,
            initChain,
        };

        // Queue for valid broadcast transactions (order/stream)
        tracker = new OrderTracker(options.emitter);

        // Transaction generator/verifier
        generator = options.txGenerator;

        // Configure StakeRebalancer module
        rebalancer = await StakeRebalancer.create({
            broadcaster: options.broadcaster,
            finalityThreshold: options.finalityThreshold,
            periodLength: options.periodLength,
            periodLimit: options.periodLimit,
            provider: options.provider,
            stakeABI: options.stakeABI,
            stakeAddress: options.stakeAddress,
            txGenerator: options.txGenerator,
        });

        // Start ABCI server (connection to Tendermint core)
        await abci(handlers).listen(options.abciServPort);
        logStart(msg.abci.messages.servStart);
    } catch (error) {
        throw new Error(`initializing abci application: ${error.message}`);
    }
    return;
}

/**
 * Starts rebalancer module and order tracker module.
 */
export async function startRebalancer(): Promise<null> {
    try {
        // Start rebalancer after sync
        const code = rebalancer.start(); // Start listening to Ethereum events
        if (code !== 0) {
            log("peg", `failed to start with code ${code}`);
            throw new Error(code.toString());
        }

        // Activate OrderTracker (after Tendermint sync)
        tracker.activate();
    } catch (error) {
        throw new Error(`activating stake rebalancer: ${error.message}`);
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
function info(request): object {
    return {
        data: "ParadigmCore ABCI Application",
        lastBlockAppHash: commitState.lastBlockAppHash,
        lastBlockHeight: commitState.lastBlockHeight,
        version
    };
}

/**
 * Called once upon chain initialization. Sets initial validators.
 *
 * @param request {RequestInitChain}    genesis information
 */
function initChain(request) {
    // Add genesis validators to in-state validator list
    request.validators.forEach((validator) => {
        // Generate hexadecimal address from public key
        let pubKey: Buffer = validator.pubKey.data;
        let addrHex: string = pubToAddr(pubKey).toString("hex");

        // Create entry if validator has not voted yet
        if (!(deliverState.validators.hasOwnProperty(addrHex))) {
            deliverState.validators[addrHex] = {
                lastProposed: null,
                lastVoted: null,
                totalVotes: 0,
                votePower: null,
            };
        }
    });

    // Do not change any parameters here
    return {};
}

/**
 * Called at the beginning of each new block. Updates proposer and block height.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function beginBlock(request): object {
    // Parse height and proposer from header
    const currHeight: number = request.header.height.low; // @TODO: consider
    const currProposer: string = request.header.proposerAddress.toString("hex");

    // Store array of last votes
    const lastVotes: object[] | undefined = request.lastCommitInfo.votes;

    // Parse validators that voted on the last block
    if (lastVotes !== undefined && lastVotes.length > 0) {
        // Iterate over votes array (supplied by Tendermint)
        lastVotes.forEach((vote: any) => {
            const valHex = vote.validator.address.toString("hex");
            const valPower = vote.validator.power.low;  // @TODO re-examine

            // Create entry if validator has not voted yet
            if (!(deliverState.validators.hasOwnProperty(valHex))) {
                deliverState.validators[valHex] = {
                    lastProposed: null,
                    lastVoted: null,
                    totalVotes: 0,
                    votePower: null,
                };
            }

            // Update vote and height trackers
            deliverState.validators[valHex].totalVotes += 1;
            deliverState.validators[valHex].lastVoted = (currHeight - 1);

            // Record if they are proposer this round
            if (valHex === currProposer) {
                deliverState.validators[valHex].lastProposed = currHeight;
            }

            // Update (or re-record) validator vote power
            deliverState.validators[valHex].votePower = valPower;
        });
    }

    // Indicate new round, return no indexing tags
    log(
        "state",
        `block #${currHeight} being proposed by validator ...${currProposer.slice(-5)}`
    );
    return {};
}

/**
 * Perform light verification on incoming transactions, accept valid
 * transactions to the mempool, and reject invalid ones.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function checkTx(request): Vote {
    // Load transaction from request
    const rawTx: Buffer = request.tx;   // Encoded/compressed tx object
    let tx: SignedTransaction;          // Decoded tx object

    // Decode the buffered and compressed transaction
    try {
        tx = decodeTx(rawTx);
    } catch (error) {
        warn("mem", msg.abci.errors.decompress);
        return Vote.invalid(msg.abci.errors.decompress);
    }

    // Verify the transaction came from a validator
    if (!preVerifyTx(tx, deliverState, generator)) {
        warn("mem", msg.abci.messages.badSig);
        return Vote.invalid(msg.abci.messages.badSig);
    }

    // Selects the proper handler verification logic based on the tx type.
    switch (tx.type) {
        // OrderBroadcast type transaction
        case "order": {
            return checkOrder(tx as SignedOrderTx, commitState, paradigm.Order);
        }

        // StreamBroadcast type external transaction
        // @TODO implement
        case "stream": {
            return checkStream(tx as SignedStreamTx, commitState);
        }

        // Validator reporting witness to Ethereum event
        case "witness": {
            return checkWitness(tx as SignedWitnessTx, commitState);
        }

        // Rebalance transaction updates limit mapping
        case "rebalance": {
            return checkRebalance(tx as SignedRebalanceTx, commitState);
        }

        // Invalid transaction type
        default: {
            warn("mem", msg.abci.errors.txType);
            return Vote.invalid(msg.abci.errors.txType);
        }
    }
}

/**
 * Execute a transaction in full: perform state modification, and verify
 * transaction validity.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function deliverTx(request): Vote {
    // Load transaction from request
    const rawTx: Buffer = request.tx;   // Encoded/compressed tx object
    let tx: SignedTransaction;          // Decoded tx object

    // Decode the buffered and compressed transaction
    try {
        tx = decodeTx(rawTx);
    } catch (error) {
        warn("state", msg.abci.errors.decompress);
        return Vote.invalid(msg.abci.errors.decompress);
    }

    // Verify the transaction came from a validator
    if (!preVerifyTx(tx, deliverState, generator)) {
        warn("state", msg.abci.messages.badSig);
        return Vote.invalid(msg.abci.messages.badSig);
    }

    // Selects the proper handler verification logic based on the tx type.
    switch (tx.type) {
        // OrderBroadcast type transaction
        case "order": {
            return deliverOrder(tx as SignedOrderTx, deliverState, tracker, paradigm.Order);
        }

        // StreamBroadcast type external transaction
        // @TODO implement
        case "stream": {
            return deliverStream(tx, deliverState, tracker);
        }

        // Validator reporting witness to Ethereum event
        case "witness": {
            return deliverWitness(tx as SignedWitnessTx, deliverState);
        }

        // Rebalance transaction updates limit mapping
        case "rebalance": {
            return deliverRebalance(
                tx as SignedRebalanceTx, deliverState, rebalancer);
        }

        // Invalid transaction type
        default: {
            warn("state", msg.abci.errors.txType);
            return Vote.invalid(msg.abci.errors.txType);
        }
    }
}

/**
 * Persist application state, synchronize commit and deliver states, and
 * trigger the broadcast of valid orders in that block.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function commit(request): string {
    let stateHash: string = "";

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
                rebalancer.synchronize(newRound, newStart, newEnd);

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
        deliverState.lastBlockHeight += 1;

        // Generate new state hash and update
        stateHash = Hasher.hashState(deliverState);
        deliverState.lastBlockAppHash = stateHash;

        // Trigger broadcast of orders and streams
        tracker.triggerBroadcast();

        // Synchronize commit state from delivertx state
        commitState = cloneDeep(deliverState);

        log(
            "state",
            `committing new state with hash: ...${stateHash.slice(-8)}`
        );
    } catch (err) {
        err("state", msg.abci.errors.broadcast);
    }

    // Return state's hash to be included in next block header
    return stateHash;
}
