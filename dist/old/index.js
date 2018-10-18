"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  index.ts @ {rebalance-refactor}
  =========================

  @date_inital 12 September 2018
  @date_modified 16 October 2018
  @author Henry Harder

  Main ABCI application supporting the OrderStream network.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const abci = require("abci");
const tendermint = require("tendermint-node");
const _ws = require("ws");
const _pjs = require("paradigm.js");
const events_1 = require("events");
const server_1 = require("./server");
const state_1 = require("./state");
const messages_1 = require("./messages");
const Logger_1 = require("./Logger");
const Vote_1 = require("./Vote");
const PayloadCipher_1 = require("./PayloadCipher");
const WebSocketMessage_1 = require("./WebSocketMessage");
const Hasher_1 = require("./Hasher");
const OrderTracker_1 = require("./OrderTracker");
const StakeRebalancer_1 = require("./StakeRebalancer");
const config_1 = require("./config");
let paradigm = new _pjs(); // new paradigm instance
let Order = paradigm.Order;
let emitter = new events_1.EventEmitter(); // event emitter for WS broadcast
let wss = new _ws.Server({ port: config_1.WS_PORT });
let rebalancer;
let tracker = new OrderTracker_1.OrderTracker(emitter);
let cipher = new PayloadCipher_1.PayloadCipher({ inputEncoding: 'utf8', outputEncoding: 'base64' });
wss.on("connection", (ws) => {
    try {
        WebSocketMessage_1.WebSocketMessage.sendMessage(ws, messages_1.messages.websocket.messages.connected);
    }
    catch (err) {
        Logger_1.Logger.websocketErr(messages_1.messages.websocket.errors.connect);
    }
    emitter.on("order", (order) => {
        try {
            wss.clients.forEach(client => {
                if ((client.readyState === 1) && (client === ws)) {
                    WebSocketMessage_1.WebSocketMessage.sendOrder(client, order);
                }
            });
        }
        catch (err) {
            Logger_1.Logger.websocketErr(messages_1.messages.websocket.errors.broadcast);
        }
    });
    ws.on('message', (msg) => {
        if (msg === "close") {
            return ws.terminate();
        }
        else {
            try {
                WebSocketMessage_1.WebSocketMessage.sendMessage(ws, `Unknown command '${msg}.'`);
            }
            catch (err) {
                Logger_1.Logger.websocketErr(msg.websocket.errors.message);
            }
        }
    });
});
wss.on('listening', (_) => {
    Logger_1.Logger.websocketEvt(messages_1.messages.websocket.messages.servStart);
});
let handlers = {
    info: (_) => {
        return {
            data: 'Stake Verification App',
            version: config_1.VERSION,
            lastBlockHeight: 0,
            lastBlockAppHash: Buffer.alloc(0)
        };
    },
    beginBlock: (request) => {
        let currHeight = request.header.height;
        let currProposer = request.header.proposerAddress.toString('hex');
        rebalancer.newOrderStreamBlock(currHeight, currProposer);
        Logger_1.Logger.newRound(currHeight, currProposer);
        return {};
    },
    checkTx: (request) => {
        let txObject;
        try {
            txObject = cipher.ABCIdecode(request.tx);
        }
        catch (error) {
            Logger_1.Logger.mempoolErr(messages_1.messages.abci.errors.decompress);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
        }
        if (txObject.type === "OrderBroadcast") {
            // tx type is OrderBroadcast
            console.log('we got an order boys');
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
            console.log("we got NOT an order");
            return Vote_1.Vote.invalid("not implemented");
        }
        else {
            // tx type doesn't match OrderBroadcast or Rebalance
            console.log("unknown transaction type");
            return Vote_1.Vote.invalid("not implemented");
        }
    },
    deliverTx: (request) => {
        let txObject;
        try {
            txObject = cipher.ABCIdecode(request.tx);
        }
        catch (error) {
            Logger_1.Logger.consensusErr(messages_1.messages.abci.errors.decompress);
            return Vote_1.Vote.invalid(messages_1.messages.abci.errors.decompress);
        }
        if (txObject.type === "OrderBroadcast") {
            // tx type is OrderBroadcast
            console.log("orderbroadcast in delivertx");
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
                    state_1.state.number += 1;
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
            console.log("we got NOT an order");
            return Vote_1.Vote.invalid("not implemented");
        }
        else {
            // tx type does not match Rebalance or OrderBroadcast
            console.log("unknown tx type");
            return Vote_1.Vote.invalid("not implemented");
        }
    },
    commit: (_) => {
        try {
            tracker.triggerBroadcast();
        }
        catch (err) {
            // console.log(err)
            Logger_1.Logger.logError("Error broadcasting TX in commit.");
        }
        return "done"; // change to something more meaningful
    }
};
async function start() {
    Logger_1.Logger.logStart();
    rebalancer = await StakeRebalancer_1.StakeRebalancer.create({
        provider: config_1.WEB3_PROVIDER,
        periodLength: config_1.PERIOD_LENGTH,
        periodLimit: config_1.PERIOD_LIMIT,
        stakeContractAddr: config_1.STAKE_CONTRACT_ADDR,
        stakeContractABI: config_1.STAKE_CONTRACT_ABI
    });
    await tendermint.init(config_1.TM_HOME);
    let node = tendermint.node(config_1.TM_HOME, {
        rpc: {
            laddr: `tcp://${config_1.ABCI_HOST}:${config_1.ABCI_RPC_PORT}`
        }
    });
    // node.stdout.pipe(process.stdout); // pipe tendermint logs to stdout
    abci(handlers).listen(config_1.ABCI_PORT, () => {
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.servStart);
        server_1.startAPIserver();
    });
    let test = async function () {
        try {
            //let client = RpcClient('http://localhost:26657');
            console.log('......... testing');
            let msg = JSON.stringify(await node.rpc.status());
            console.log("... msg: " + msg);
        }
        catch (error) {
            console.log('fucked: ' + error);
        }
    };
    setTimeout(test, 3000);
}
start();
