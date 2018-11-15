"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const Logger_1 = require("../../util/Logger");
const messages_1 = require("../../util/static/messages");
const Vote_1 = require("../util/Vote");
function checkRebalance(tx, state) {
    const proposal = tx.data;
    switch (state.round.number) {
        case 0: {
            if (proposal.round.number === 1) {
                Logger_1.Logger.mempool(messages_1.messages.rebalancer.messages.iAccept);
                return Vote_1.Vote.valid();
            }
            else {
                Logger_1.Logger.mempoolWarn(messages_1.messages.rebalancer.messages.iReject);
                return Vote_1.Vote.invalid();
            }
        }
        default: {
            if ((1 + state.round.number) === proposal.round.number) {
                Logger_1.Logger.mempool(messages_1.messages.rebalancer.messages.accept);
                return Vote_1.Vote.valid(messages_1.messages.rebalancer.messages.accept);
            }
            else {
                Logger_1.Logger.mempoolWarn(messages_1.messages.rebalancer.messages.reject);
                return Vote_1.Vote.invalid(messages_1.messages.rebalancer.messages.reject);
            }
        }
    }
}
exports.checkRebalance = checkRebalance;
function deliverRebalance(tx, state, rb) {
    const proposal = tx.data;
    switch (state.round.number) {
        case 0: {
            if (proposal.round.number === 1) {
                state.round.number += 1;
                state.round.startsAt = proposal.round.startsAt;
                state.round.endsAt = proposal.round.endsAt;
                state.round.limit = proposal.round.limit;
                Logger_1.Logger.consensus(messages_1.messages.rebalancer.messages.iAccept);
                return Vote_1.Vote.valid();
            }
            else {
                Logger_1.Logger.consensusWarn(messages_1.messages.rebalancer.messages.iReject);
                return Vote_1.Vote.invalid();
            }
        }
        default: {
            if ((1 + state.round.number) === proposal.round.number) {
                const propLimits = proposal.limits;
                const localLimits = genLimits(state.balances, state.round.limit);
                if (_.isEqual(propLimits, localLimits)) {
                    state.round.number += 1;
                    state.round.startsAt = proposal.round.startsAt;
                    state.round.endsAt = proposal.round.endsAt;
                    state.limits = proposal.limits;
                    Logger_1.Logger.consensus(messages_1.messages.rebalancer.messages.accept);
                    return Vote_1.Vote.valid(messages_1.messages.rebalancer.messages.accept);
                }
                else {
                    Logger_1.Logger.consensusWarn(messages_1.messages.rebalancer.messages.noMatch);
                    return Vote_1.Vote.invalid(messages_1.messages.rebalancer.messages.noMatch);
                }
            }
            else if ((1 + state.round.number) < proposal.round.number) {
                Logger_1.Logger.consensusWarn(messages_1.messages.rebalancer.messages.wrongRound);
                return Vote_1.Vote.invalid(messages_1.messages.rebalancer.messages.wrongRound);
            }
            else {
                Logger_1.Logger.consensusWarn(messages_1.messages.rebalancer.messages.reject);
                return Vote_1.Vote.invalid(messages_1.messages.rebalancer.messages.reject);
            }
        }
    }
}
exports.deliverRebalance = deliverRebalance;
function genLimits(bals, limit) {
    let total = BigInt(0);
    const output = {};
    Object.keys(bals).forEach((k, v) => {
        if (bals.hasOwnProperty(k) && typeof (bals[k]) === "bigint") {
            total += bals[k];
        }
    });
    Object.keys(bals).forEach((k, v) => {
        if (bals.hasOwnProperty(k) && typeof (bals[k]) === "bigint") {
            const bal = parseInt(bals[k].toString(), 10);
            const tot = parseInt(total.toString(), 10);
            const lim = (bal / tot) * limit;
            output[k] = {
                orderLimit: Math.floor(lim),
                streamLimit: 1,
            };
        }
    });
    return output;
}
