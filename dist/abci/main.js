"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const abci = require("abci");
const _ = require("lodash");
const messages_1 = require("../util/static/messages");
const OrderTracker_1 = require("../async/OrderTracker");
const StakeRebalancer_1 = require("../async/StakeRebalancer");
const Hasher_1 = require("../crypto/Hasher");
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const Logger_1 = require("../util/Logger");
const Vote_1 = require("./util/Vote");
const order_1 = require("./handlers/order");
const rebalance_1 = require("./handlers/rebalance");
const witness_1 = require("./handlers/witness");
let version;
let handlers;
let generator;
let tracker;
let rebalancer;
let deliverState;
let commitState;
async function startMain(options) {
    try {
        version = options.version;
        deliverState = options.deliverState;
        commitState = options.commitState;
        handlers = {
            beginBlock,
            checkTx,
            commit,
            deliverTx,
            info,
        };
        tracker = new OrderTracker_1.OrderTracker(options.emitter);
        generator = options.txGenerator;
        rebalancer = await StakeRebalancer_1.StakeRebalancer.create({
            broadcaster: options.broadcaster,
            finalityThreshold: options.finalityThreshold,
            periodLength: options.periodLength,
            periodLimit: options.periodLimit,
            provider: options.provider,
            stakeABI: options.stakeABI,
            stakeAddress: options.stakeAddress,
            txGenerator: options.txGenerator,
        });
        await abci(handlers).listen(options.abciServPort);
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.servStart);
    }
    catch (err) {
        throw new Error("Error initializing ABCI application.");
    }
    return;
}
exports.startMain = startMain;
async function startRebalancer() {
    try {
        const code = rebalancer.start();
        if (code !== 0) {
            Logger_1.Logger.rebalancerErr(`Failed to start rebalancer. Code ${code}`);
            throw new Error(code.toString());
        }
        tracker.activate();
    }
    catch (err) {
        throw new Error("Error activating stake rebalancer.");
    }
    return;
}
exports.startRebalancer = startRebalancer;
function info() {
    return {
        data: "ParadigmCore ABCI Application",
        lastBlockAppHash: commitState.lastBlockAppHash,
        lastBlockHeight: commitState.lastBlockHeight,
        version,
    };
}
function beginBlock(request) {
    const currHeight = request.header.height.low;
    const currProposer = request.header.proposerAddress.toString("hex");
    const lastVotes = request.lastCommitInfo.votes;
    if (lastVotes !== undefined && lastVotes.length > 0) {
        lastVotes.forEach((vote) => {
            const valHex = vote.validator.address.toString("hex");
            const valPower = vote.validator.power.low;
            if (!(deliverState.validators.hasOwnProperty(valHex))) {
                deliverState.validators[valHex] = {
                    lastProposed: null,
                    lastVoted: null,
                    totalVotes: 0,
                    votePower: null,
                };
            }
            deliverState.validators[valHex].totalVotes += 1;
            deliverState.validators[valHex].lastVoted = (currHeight - 1);
            if (valHex === currProposer) {
                deliverState.validators[valHex].lastProposed = currHeight;
            }
            deliverState.validators[valHex].votePower = valPower;
        });
    }
    Logger_1.Logger.newRound(currHeight, currProposer);
    return {};
}
function checkTx(request) {
    const rawTx = request.tx;
    let tx;
    let txType;
    let sigOk;
    try {
        tx = PayloadCipher_1.PayloadCipher.ABCIdecode(rawTx);
        txType = tx.type.toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.decompress);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
    }
    try {
        sigOk = generator.verify(tx);
        if (!sigOk) {
            Logger_1.Logger.mempoolWarn(messages_1.messages.abci.messages.badSig);
            return Vote_1.Vote.invalid(messages_1.messages.abci.messages.badSig);
        }
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.signature);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.signature);
    }
    switch (txType) {
        case "order": {
            return order_1.checkOrder(tx, commitState);
        }
        case "witness": {
            return witness_1.checkWitness(tx, commitState);
        }
        case "rebalance": {
            return rebalance_1.checkRebalance(tx, commitState);
        }
        default: {
            Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.txType);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.txType);
        }
    }
}
function deliverTx(request) {
    const rawTx = request.tx;
    let tx;
    let txType;
    let sigOk;
    try {
        tx = PayloadCipher_1.PayloadCipher.ABCIdecode(rawTx);
        txType = tx.type.toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.decompress);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
    }
    try {
        sigOk = generator.verify(tx);
        if (!sigOk) {
            Logger_1.Logger.mempoolWarn(messages_1.messages.abci.messages.badSig);
            return Vote_1.Vote.invalid(messages_1.messages.abci.messages.badSig);
        }
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.signature);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.signature);
    }
    switch (txType) {
        case "order": {
            return order_1.deliverOrder(tx, deliverState, tracker);
        }
        case "witness": {
            return witness_1.deliverWitness(tx, deliverState);
        }
        case "rebalance": {
            return rebalance_1.deliverRebalance(tx, deliverState, rebalancer);
        }
        default: {
            Logger_1.Logger.consensusWarn(messages_1.messages.abci.errors.txType);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.txType);
        }
    }
}
function commit(request) {
    let stateHash = "";
    try {
        const roundDiff = deliverState.round.number - commitState.round.number;
        switch (roundDiff) {
            case 0: {
                break;
            }
            case 1: {
                const newRound = deliverState.round.number;
                const newStart = deliverState.round.startsAt;
                const newEnd = deliverState.round.endsAt;
                rebalancer.synchronize(newRound, newStart, newEnd);
                break;
            }
            default: {
                Logger_1.Logger.consensusWarn(messages_1.messages.abci.messages.roundDiff);
                break;
            }
        }
        deliverState.lastBlockHeight += 1;
        stateHash = Hasher_1.Hasher.hashState(deliverState);
        deliverState.lastBlockAppHash = stateHash;
        tracker.triggerBroadcast();
        commitState = _.cloneDeep(deliverState);
        Logger_1.Logger.consensus(`Commit and broadcast complete. Current state hash: ${stateHash}`);
    }
    catch (err) {
        Logger_1.Logger.consensusErr(messages_1.messages.abci.errors.broadcast);
    }
    console.log(`\n... Current state: ${JSON.stringify(commitState)}\n`);
    return stateHash;
}
