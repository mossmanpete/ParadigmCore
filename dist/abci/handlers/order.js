"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Paradigm = require("paradigm-connect");
const Hasher_1 = require("../../crypto/Hasher");
const Logger_1 = require("../../util/Logger");
const messages_1 = require("../../util/static/messages");
const Vote_1 = require("../util/Vote");
const Order = new Paradigm().Order;
function checkOrder(tx, state) {
    let order;
    let poster;
    try {
        order = new Order(tx.data);
        poster = order.recoverPoster().toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.errors.format);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
    }
    if (state.limits.hasOwnProperty(poster) &&
        state.limits[poster].orderLimit > 0) {
        Logger_1.Logger.mempool(messages_1.messages.abci.messages.mempool);
        return Vote_1.Vote.valid(`(unconfirmed) OrderID: ${Hasher_1.Hasher.hashOrder(order)}`);
    }
    else {
        Logger_1.Logger.mempoolWarn(messages_1.messages.abci.messages.noStake);
        return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
    }
}
exports.checkOrder = checkOrder;
function deliverOrder(tx, state, q) {
    let order;
    let poster;
    try {
        order = new Order(tx.data);
        poster = order.recoverPoster().toLowerCase();
    }
    catch (err) {
        Logger_1.Logger.consensusWarn(messages_1.messages.abci.errors.format);
        return Vote_1.Vote.invalid(messages_1.messages.abci.errors.format);
    }
    if (state.limits.hasOwnProperty(poster) &&
        state.limits[poster].orderLimit > 0) {
        const orderCopy = order.toJSON();
        orderCopy.id = Hasher_1.Hasher.hashOrder(order);
        state.limits[poster].orderLimit -= 1;
        state.orderCounter += 1;
        q.add(orderCopy);
        Logger_1.Logger.consensus(messages_1.messages.abci.messages.verified);
        return Vote_1.Vote.valid(`(confirmed) OrderID: ${orderCopy.id}`);
    }
    else {
        Logger_1.Logger.consensusWarn(messages_1.messages.abci.messages.noStake);
        return Vote_1.Vote.invalid(messages_1.messages.abci.messages.noStake);
    }
}
exports.deliverOrder = deliverOrder;
