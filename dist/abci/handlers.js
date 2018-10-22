"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  handlers.ts @ {rebalance-refactor}
  =========================

  @date_inital 16 September 2018
  @date_modified 19 October 2018
  @author Henry Harder

  ABCI handler functions and state-transition logic.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const Paradigm = require("paradigm-connect");
const abci = require("abci");
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const Hasher_1 = require("../crypto/Hasher");
const Vote_1 = require("../util/Vote");
const Logger_1 = require("../util/Logger");
const OrderTracker_1 = require("../async/OrderTracker");
const StakeRebalancer_1 = require("../async/StakeRebalancer");
const messages_1 = require("../util/messages");
const config_1 = require("../config");
let Order = new Paradigm().Order;
let tracker; // used to broadcast orders
let rebalancer; // construct and submit mapping
let dState; // deliverTx state
let cState; // commit state
let handlers; // ABCI handler functions
/**
 * start (exported function): Initialize and start the ABCI application.
 *
 * @param _state {object} initial network state
 * @param emitter {EventEmitter} emitter to attach to OrderTracker
 */
async function startMain(deliverState, commitState, emitter) {
    try {
        dState = deliverState;
        cState = commitState;
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
            provider: config_1.WEB3_PROVIDER,
            periodLength: config_1.PERIOD_LENGTH,
            periodLimit: config_1.PERIOD_LIMIT,
            stakeContractAddr: config_1.STAKE_CONTRACT_ADDR,
            stakeContractABI: config_1.STAKE_CONTRACT_ABI,
            tendermintRpcHost: config_1.ABCI_HOST,
            tendermintRpcPort: config_1.ABCI_RPC_PORT
        });
        await abci(handlers).listen(config_1.ABCI_PORT);
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.servStart);
    }
    catch (err) {
        throw new Error('Error initializing ABCI application.');
    }
    return;
}
exports.startMain = startMain;
/**
 * startRebalancer (export async function): Call after ABCI/Tendermint has synchronized
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
function info(_) {
    return {
        data: 'ParadigmCore ABCI Application',
        version: config_1.VERSION,
        lastBlockHeight: 0,
        lastBlockAppHash: Buffer.alloc(0)
    };
}
function beginBlock(request) {
    let currHeight = request.header.height;
    let currProposer = request.header.proposerAddress.toString('hex');
    rebalancer.newOrderStreamBlock(currHeight, currProposer);
    Logger_1.Logger.newRound(currHeight, currProposer);
    return {};
}
function checkTx(request) {
    let txObject;
    try {
        txObject = PayloadCipher_1.PayloadCipher.ABCIdecode(request.tx);
    }
    catch (error) {
        Logger_1.Logger.mempoolErr(messages_1.messages.abci.errors.decompress);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
    }
    if (txObject.type === "OrderBroadcast") {
        // TX type is OrderBroadcast
        try {
            let newOrder = new Order(txObject.data);
            let recoveredAddr = newOrder.recoverPoster().toLowerCase();
            console.log(`(temporary) Recovered address: ${recoveredAddr}`);
            if (cState.mapping.hasOwnProperty(recoveredAddr)) {
                // if staker has an entry in state
                Logger_1.Logger.mempool(messages_1.messages.abci.messages.mempool);
                return Vote_1.Vote.valid(Hasher_1.Hasher.hashOrder(newOrder));
            }
            else {
                // no stake in mapping
                Logger_1.Logger.mempool(messages_1.messages.abci.messages.noStake);
                return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
            }
        }
        catch (error) {
            // eror constructing order
            Logger_1.Logger.mempoolErr(messages_1.messages.abci.errors.format);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
        }
    }
    else if (txObject.type === 'Rebalance') { // tx type is Rebalance
        if ((cState.round.number === 0) && (txObject.data.round.number === 1)) {
            // This is the condition to accept the first rebalance transaction
            // that sets the initial staking period.
            Logger_1.Logger.mempool('Initial rebalance proposal accepted.');
            return Vote_1.Vote.valid(); // vote to accept state
        }
        else if (cState.round.number === txObject.data.round.number - 1) {
            // Condition to see if the proposal is for the next staking period
            Logger_1.Logger.mempool('Rebalance proposal accepted.');
            return Vote_1.Vote.valid('Rebalance proposal accepted.');
        }
        Logger_1.Logger.mempool('Invalid rebalance proposal rejected.');
        return Vote_1.Vote.invalid("Invalid rebalance proposal rejected.");
    }
    else {
        // Tx type doesn't match OrderBroadcast or Rebalance
        Logger_1.Logger.mempoolErr("Invalid transaction type rejected.");
        return Vote_1.Vote.invalid("Unknown transaction type.");
    }
}
function deliverTx(request) {
    let txObject;
    try {
        txObject = PayloadCipher_1.PayloadCipher.ABCIdecode(request.tx);
    }
    catch (error) {
        Logger_1.Logger.consensusErr(messages_1.messages.abci.errors.decompress);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
    }
    if (txObject.type === "OrderBroadcast") {
        // TX type is OrderBroadcast
        try {
            let newOrder = new Order(txObject.data);
            let recoveredAddr = newOrder.recoverPoster().toLowerCase();
            if (dState.mapping[recoveredAddr].orderBroadcastLimit > 0) {
                // Condition to see if poster has sufficient quota for order broadcast
                let dupOrder = newOrder.toJSON(); // create copy of order
                dupOrder.id = Hasher_1.Hasher.hashOrder(newOrder); // append OrderID
                console.log(`... before (delivertx) cState: ${JSON.stringify(cState)}`);
                console.log(`... before (delivertx) dState: ${JSON.stringify(dState)}\n`);
                // Begin state modification
                dState.mapping[recoveredAddr].orderBroadcastLimit -= 1; // decrease quota by 1
                dState.orderCounter += 1; // add 1 to total number of orders
                // End state modification
                console.log(`... after (delivertx) cState: ${JSON.stringify(cState)}`);
                console.log(`... after (delivertx) dState: ${JSON.stringify(dState)}\n`);
                tracker.add(dupOrder); // add order to queue for broadcast
                Logger_1.Logger.consensus(`(Temporary log) Poster remaining quota:${dState.mapping[recoveredAddr].orderBroadcastLimit}`);
                Logger_1.Logger.consensus(messages_1.messages.abci.messages.verified);
                return Vote_1.Vote.valid(dupOrder.id);
            }
            else {
                // Poster does not have sufficient order quota
                Logger_1.Logger.consensus(messages_1.messages.abci.messages.noStake);
                return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
            }
        }
        catch (error) {
            Logger_1.Logger.consensusErr(messages_1.messages.abci.errors.format);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
        }
    }
    else if (txObject.type === "Rebalance") {
        // Rate-limit mapping rebalance proposal transaction type logic
        if ((dState.round.number === 0) && (txObject.data.round.number === 1)) {
            // Should only be triggered by the first rebalance TX
            // Begin state modification
            dState.round.number += 1;
            dState.round.startsAt = txObject.data.round.startsAt;
            dState.round.endsAt = txObject.data.round.endsAt;
            dState.mapping = txObject.data.mapping;
            // End state modification
            Logger_1.Logger.consensus("Accepted parameters for first staking period.");
            return Vote_1.Vote.valid("Accepted parameters for first staking period.");
        }
        else if (dState.round.number > 0) {
            // TODO: decide if there is a better way to write these conditions
            if (txObject.data.round.number === (dState.round.number + 1)) {
                let roundInfo = rebalancer.getConstructedMapping();
                let validFor = roundInfo.validFor;
                let localMapping = roundInfo.mapping;
                if (JSON.stringify(localMapping) === JSON.stringify(txObject.data.mapping)) {
                    // Condition will be true if proposed mapping matches the one
                    // constructed by the node voting on the proposal. 
                    // Begin state modification
                    dState.round.number = txObject.data.round.number;
                    dState.round.startsAt = txObject.data.round.startsAt;
                    dState.round.endsAt = txObject.data.round.endsAt;
                    dState.mapping = txObject.data.mapping;
                    // End state modification
                    Logger_1.Logger.consensus(`State proposal accepted for staking period #${dState.round.number}`);
                    return Vote_1.Vote.valid();
                }
                else {
                    Logger_1.Logger.consensusWarn(`Proposal rejected. New state does not match local mapping.`);
                    return Vote_1.Vote.invalid();
                }
            }
            else {
                Logger_1.Logger.consensusWarn(`Warning: Rejected. Proposal is for for wrong staking period.`);
                return Vote_1.Vote.invalid("Invalid rebalance proposal rejected.");
            }
        }
        // TODO: should this be included in an else block?
        // Or is it safe to assume this block will not be reached otherwise?
        Logger_1.Logger.consensusErr("State is potentially corrupt. May affect node's ability to reach consensus.");
        return Vote_1.Vote.invalid();
    }
    else {
        // TX type does not match Rebalance or OrderBroadcast
        Logger_1.Logger.consensusErr("Invalid transaction type rejected.");
        return Vote_1.Vote.invalid("Invalid transaction type.");
    }
}
function commit(request) {
    let stateHash; // stores the hash of current state
    console.log(`d starts at: ${dState.round.startsAt}`);
    console.log(`c starts at: ${dState.round.startsAt}\n`);
    console.log(`... (pr) dState: ${Hasher_1.Hasher.hashState(dState)}`);
    console.log(`... (pr) cState: ${Hasher_1.Hasher.hashState(cState)}\n`);
    try {
        // if ((state.round.startsAt > 0) && (rebalancer.getPeriodNumber() + 1 === state.round.number)) {
        if (dState.round.number > cState.round.number) { //&& (rebalancer.getPeriodNumber() + 1 === state.round.number)) {
            if (dState.round.startsAt > (cState.round.startsAt + 1)) {
                Logger_1.Logger.consensusWarn("This round deliverTx state is more than 1 period ahead of commited state.");
            }
            let newRound = dState.round.number;
            let newStart = dState.round.startsAt;
            let newEnd = dState.round.endsAt;
            // Update rebalancer with new in-state staking parameters
            rebalancer.synchronize(newRound, newStart, newEnd);
        }
        // Synchronize dState (deliverTx) and cState (commit)
        cState = JSON.parse(JSON.stringify(dState)); // copy states
        // Broadcast orders in block via WS
        tracker.triggerBroadcast();
        stateHash = Hasher_1.Hasher.hashState(cState); // generate the hash of the new state
        Logger_1.Logger.consensus(`Commit and broadcast complete. Current state hash: ${stateHash}`);
        // temporary
        console.log(`... (po) dState: ${Hasher_1.Hasher.hashState(dState)}`);
        console.log(`... (po) cState: ${Hasher_1.Hasher.hashState(cState)}\n`);
        console.log(`(temp) cState hash: ${Hasher_1.Hasher.hashState(cState)}`);
        console.log(`(temp) dState hash: ${Hasher_1.Hasher.hashState(dState)}`);
    }
    catch (err) {
        console.log(err); // temporary
        Logger_1.Logger.consensusWarn("Error broadcasting orders (may require process termination).");
    }
    return stateHash; // TODO: is this the correct thing to return?
}
