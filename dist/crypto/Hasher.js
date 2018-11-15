"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hash = require("object-hash");
const bigIntUtils_1 = require("../util/static/bigIntUtils");
class Hasher {
    static hashOrder(order) {
        const hashPrep = {
            makerValues: order.makerValues,
            posterSignature: order.posterSignature,
            subContract: order.subContract,
        };
        try {
            const orderHash = hash(hashPrep);
            return orderHash;
        }
        catch (error) {
            throw new Error("Error generating order hash.");
        }
    }
    static hashState(state) {
        const hashPrep = {
            balances: JSON.stringify(state.balances, bigIntUtils_1.bigIntReplacer),
            endHeight: state.round.endsAt,
            events: JSON.stringify(state.events, bigIntUtils_1.bigIntReplacer),
            lastHeight: state.lastBlockHeight,
            limits: JSON.stringify(state.limits),
            ordernum: state.orderCounter,
            roundNumber: state.round.number,
            startHeight: state.round.startsAt,
            lastHash: state.lastBlockAppHash
        };
        try {
            const stateHash = hash(hashPrep);
            return stateHash;
        }
        catch (error) {
            throw new Error("Error generating state hash.");
        }
    }
}
exports.Hasher = Hasher;
