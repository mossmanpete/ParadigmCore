"use strict";
/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Hasher.ts
 * @module crypto
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  19-August-2018
 * @date (modified) 02-November-2018
 *
 * Hashing class to allow creation of state hashes. Also used to generate
 * ID's (orderID) for valid orders.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const hash = require("object-hash");
const Logger_1 = require("../util/Logger");
class Hasher {
    /**
     * Generate the hash of an order to be used as the OrderID.
     *
     * @param order {paradigm.Order} A Paradigm order object to be hashed
     */
    static hashOrder(order) {
        // TODO: change to @type: paradigm.Order
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
    /**
     * Generate a hash of the state.
     *
     * @param state {State} the current state object
     */
    static hashState(state) {
        const hashPrep = {
            balances: state.balances,
            endHeight: state.round.endsAt,
            events: state.events,
            lastHeight: state.lastBlockHeight,
            limits: state.limits,
            ordernum: state.orderCounter,
            roundNumber: state.round.number,
            startHeight: state.round.startsAt,
        };
        try {
            const stateHash = hash(hashPrep);
            return stateHash;
        }
        catch (error) {
            Logger_1.Logger.logError("(Temporary log) Error generating state hash.");
            throw new Error("Error generating state hash.");
        }
    }
}
exports.Hasher = Hasher;
