"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hash = require("object-hash");
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
            balances: JSON.stringify(state.balances),
            endHeight: state.round.endsAt,
            events: JSON.stringify(state.events),
            lastHeight: state.lastBlockHeight,
            limits: JSON.stringify(state.limits),
            ordernum: state.orderCounter,
            roundNumber: state.round.number,
            startHeight: state.round.startsAt,
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
