/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name main.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  15-October-2018
 * @date (modified) 19-January-2018
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
import { pubToAddr } from "../util/static/valFunctions";
import { computeConf, decodeTx, preVerifyTx, syncStates } from "./util/utils";

// Custom types
import { ParadigmCoreOptions } from "../typings/abci";

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
function infoWrapper(state: State, version: string): (r) => any {
    return (request) => {
        return {
            data: "ParadigmCore (alpha)",
            lastBlockAppHash: state.lastBlockAppHash,
            lastBlockHeight: state.lastBlockHeight,
            version
        };
    };
}

/**
 * Called once upon chain initialization. Sets initial validators and consensus
 * parameters.
 *
 * @param request {RequestInitChain}    genesis information
 */
function initChainWrapper(
    deliverState: State,
    commitState: State,
    params: ConsensusParams
): (r) => any {
    // Destructure initial consensus parameters
    const {
        finalityThreshold,
        periodLimit,
        periodLength,
        maxOrderBytes
    } = params;

    // Return initChain function
    return (request) => {
        // add genesis validators to in-state validator list
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

        // set initial consensus parameters
        deliverState.consensusParams = {
            finalityThreshold,
            periodLength,
            periodLimit,
            maxOrderBytes,
            confirmationThreshold: computeConf(request.validators.length),
        };

        // synchronize states upon network genesis
        syncStates(deliverState, commitState);

        // Do not change any other parameters here
        return {};
    };
}

/**
 * Called at the beginning of each new block. Updates proposer and block height.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function beginBlockWrapper(state: State): (r) => any {
    console.log(`\n... (begin) state: ${JSON.stringify(state, bigIntReplacer)}\n`);
    return (request) => {
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
                if (!(state.validators.hasOwnProperty(valHex))) {
                    state.validators[valHex] = {
                        lastProposed: null,
                        lastVoted: null,
                        totalVotes: 0,
                        votePower: null,
                    };
                }

                // Update vote and height trackers
                state.validators[valHex].totalVotes += 1;
                state.validators[valHex].lastVoted = (currHeight - 1);

                // Record if they are proposer this round
                if (valHex === currProposer) {
                    state.validators[valHex].lastProposed = currHeight;
                }

                // Update (or re-record) validator vote power
                state.validators[valHex].votePower = valPower;
            });
        }

        // update confirmation threshold based on number of active validators
        // confirmation threshold is >=2/3 active validators, unless there is
        // only one active validator, in which case it MUST be 1 in order for
        // state.balances to remain accurate.
        state.consensusParams.confirmationThreshold = computeConf(lastVotes.length);

        // Indicate new round, return no indexing tags
        log(
            "state",
            `block #${currHeight} being proposed by validator ...${currProposer.slice(-5)}`
        );
        return {};
    };
}

/**
 * Perform light verification on incoming transactions, accept valid
 * transactions to the mempool, and reject invalid ones.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function checkTxWrapper(
    state: State,
    msg: MasterLogTemplates,
    generator: TxGenerator,
    Order: any
): (r) => Vote {
    return (request) => {
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
        if (!preVerifyTx(tx, state, generator)) {
            warn("mem", msg.abci.messages.badSig);
            return Vote.invalid(msg.abci.messages.badSig);
        }

        // Selects the proper handler verification logic based on the tx type.
        switch (tx.type) {
            // OrderBroadcast type transaction
            case "order": {
                return checkOrder(tx as SignedOrderTx, state, Order);
            }

            // StreamBroadcast type external transaction
            // @TODO implement
            case "stream": {
                return checkStream(tx as SignedStreamTx, state);
            }

            // Validator reporting witness to Ethereum event
            case "witness": {
                return checkWitness(tx as SignedWitnessTx, state);
            }

            // Rebalance transaction updates limit mapping
            case "rebalance": {
                return checkRebalance(tx as SignedRebalanceTx, state);
            }

            // Invalid transaction type
            default: {
                warn("mem", msg.abci.errors.txType);
                return Vote.invalid(msg.abci.errors.txType);
            }
        }
    };
}

/**
 * Execute a transaction in full: perform state modification, and verify
 * transaction validity.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
function deliverTxWrapper(
    state: State,
    msg: MasterLogTemplates,
    tracker: OrderTracker,
    generator: TxGenerator,
    Order: any
): (r) => Vote {
    return (request) => {
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
        if (!preVerifyTx(tx, state, generator)) {
            warn("state", msg.abci.messages.badSig);
            return Vote.invalid(msg.abci.messages.badSig);
        }

        // Selects the proper handler verification logic based on the tx type.
        switch (tx.type) {
            // OrderBroadcast type transaction
            case "order": {
                return deliverOrder(tx as SignedOrderTx, state, tracker, Order);
            }

            // StreamBroadcast type external transaction
            // @TODO implement
            case "stream": {
                return deliverStream(tx, state, tracker);
            }

            // Validator reporting witness to Ethereum event
            case "witness": {
                return deliverWitness(tx as SignedWitnessTx, state);
            }

            // Rebalance transaction updates limit mapping
            case "rebalance": {
                return deliverRebalance(tx as SignedRebalanceTx, state);
            }

            // Invalid transaction type
            default: {
                warn("state", msg.abci.errors.txType);
                return Vote.invalid(msg.abci.errors.txType);
            }
        }
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
): (r) => string {
    return (request) => {
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
            deliverState.lastBlockHeight += 1;

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
            err("state", msg.abci.errors.broadcast);
        }

        // Return state's hash to be included in next block header
        return stateHash;
    };
}
