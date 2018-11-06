"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Paradigm = require("paradigm-connect");
const Logger_1 = require("../../util/Logger");
const messages_1 = require("../../util/static/messages");
const Vote_1 = require("../util/Vote");
const Order = new Paradigm().Order;
function checkStream(tx, state) {
    let order;
    let poster;
    try {
        order = new Order(tx);
        poster = order.recoverPoster().toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.format);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
    }
    if (state.mappings.limits.hasOwnProperty(poster)) {
        Logger_1.Logger.mempool(messages_1.messages.abci.messages.mempool);
        return Vote_1.Vote.valid(messages_1.messages.abci.messages.mempool);
    }
    else {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.messages.noStake);
        return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
    }
}
exports.checkStream = checkStream;
function deliverStream(tx, state, tracker) {
    return 0;
}
exports.deliverStream = deliverStream;
