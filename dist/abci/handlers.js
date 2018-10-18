"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  handlers.ts @ {rebalance-refactor}
  =========================

  @date_inital 16 September 2018
  @date_modified 17 October 2018
  @author Henry Harder

  ABCI handler functions and state-transition logic.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const Paradigm = require("paradigm.js");
const abci = require("abci");
const Hasher_1 = require("../crypto/Hasher");
const PayloadCipher_1 = require("../crypto/PayloadCipher");
const Vote_1 = require("../util/Vote");
const Logger_1 = require("../util/Logger");
const OrderTracker_1 = require("../async/OrderTracker");
const StakeRebalancer_1 = require("../async/StakeRebalancer");
const messages_1 = require("../util/messages");
const config_1 = require("../config");
let Order = new Paradigm().Order;
let tracker; // used to broadcast orders
let rebalancer; // construct and submit mapping
let state; // network rate-limit state
let handlers; // ABCI handler functions
/**
 * start (exported function): Initialize and start the ABCI application.
 *
 * @param emitter {EventEmitter} global event emitter for tracking orders
 * @param port {number} port to use for the ABCI application
 */
async function start(_emitter, _state) {
    try {
        state = _state;
        handlers = {
            info: info,
            beginBlock: beginBlock,
            checkTx: checkTx,
            deliverTx: deliverTx,
            commit: commit
        };
        tracker = new OrderTracker_1.OrderTracker(_emitter);
        rebalancer = await StakeRebalancer_1.StakeRebalancer.create({
            provider: config_1.WEB3_PROVIDER,
            periodLength: config_1.PERIOD_LENGTH,
            periodLimit: config_1.PERIOD_LIMIT,
            stakeContractAddr: config_1.STAKE_CONTRACT_ADDR,
            stakeContractABI: config_1.STAKE_CONTRACT_ABI
        });
        //abci(handlers).listen(ABCI_PORT, () => {
        //    Logger.consensus(msg.abci.messages.servStart);
        //});
        await abci(handlers).listen(config_1.ABCI_PORT);
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.servStart);
    }
    catch (err) {
        // TODO: change to exceptions
        return 1; // not okay
    }
    return 0; // okay
}
exports.start = start;
function info(_) {
    return {
        data: 'Stake Verification App',
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
        // tx type is OrderBroadcast
        try {
            let newOrder = new Order(txObject.data);
            let recoveredAddr = newOrder.recoverPoster();
            if (typeof (recoveredAddr) === "string") {
                /*
                  The above conditional shoud rely on a verifyStake(), that checks
                  the existing state for that address.
                */
                Logger_1.Logger.mempool(messages_1.messages.abci.messages.mempool);
                return Vote_1.Vote.valid(Hasher_1.Hasher.hashOrder(newOrder));
            }
            else {
                Logger_1.Logger.mempool(messages_1.messages.abci.messages.noStake);
                return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
            }
        }
        catch (error) {
            Logger_1.Logger.mempoolErr(messages_1.messages.abci.errors.format);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
        }
    }
    else if (txObject.type === 'Rebalance') {
        // tx type is Rebalance
        console.log("we got a rebalance event");
        return Vote_1.Vote.invalid("not implemented");
    }
    else {
        // tx type doesn't match OrderBroadcast or Rebalance
        Logger_1.Logger.mempoolErr("Unknown transaction type.");
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
        // tx type is OrderBroadcast
        try {
            let newOrder = new Order(txObject.data);
            let recoveredAddr = newOrder.recoverPoster();
            if (typeof (recoveredAddr) === "string") {
                /*
                  The above conditional shoud rely on a verifyStake(), that checks
                  the existing state for that address.
      
                  BEGIN STATE MODIFICATION
                */
                let dupOrder = newOrder.toJSON();
                dupOrder.id = Hasher_1.Hasher.hashOrder(newOrder);
                //emitter.emit("order", dupOrder); // broadcast order event
                tracker.add(dupOrder); // add order to queue for broadcast
                state.number += 1;
                /*
                  END STATE MODIFICATION
                */
                Logger_1.Logger.consensus(messages_1.messages.abci.messages.verified);
                return Vote_1.Vote.valid(dupOrder.id);
            }
            else {
                Logger_1.Logger.consensus(messages_1.messages.abci.messages.noStake);
                return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
            }
        }
        catch (error) {
            // console.log(error);
            Logger_1.Logger.consensusErr(messages_1.messages.abci.errors.format);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
        }
    }
    else if (txObject.type === "Rebalance") {
        // tx type is Rebalance
        console.log("we got a rebalance event");
        return Vote_1.Vote.invalid("not implemented");
    }
    else {
        // tx type does not match Rebalance or OrderBroadcast
        Logger_1.Logger.consensusErr("Unknown transaction type.");
        return Vote_1.Vote.invalid("not implemented");
    }
}
function commit(request) {
    try {
        tracker.triggerBroadcast();
    }
    catch (err) {
        // console.log(err)
        Logger_1.Logger.logError("Error broadcasting TX in commit.");
    }
    return "done"; // change to something more meaningful
}
