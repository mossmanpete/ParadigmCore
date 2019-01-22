/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name witness.ts
 * @module src/core/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 21-January-2019
 *
 * Handler functions for verifying ABCI event Witness transactions,
 * originating from validator nodes. Implements state transition logic as
 * specified in the spec for this TX type.
 */

 // ParadigmCore classes
import { log, warn } from "../../util/log";
import { Vote } from "../util/Vote";

// ParadigmCore utilities
import { parseWitness, updateMappings, createWitnessEventHash } from "../util/utils";
import { ParsedWitnessData } from "../../typings/abci";

/**
 * Performs mempool verification of Ethereum StakeEvent transactions.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkWitness(tx: SignedWitnessTx, state: State): Vote {
    try {
        parseWitness(tx.data);
        log("mem", "stake witness transaction accepted");
        return Vote.valid("stake witness transaction accepted");
    } catch (error) {
        // TODO: don't log caught error?
        warn("mem", `invalid witness event rejected: ${error.message}`);
        return Vote.invalid("invalid witness event rejected");
    }
}

/**
 * Performs state modification of Stake Event transactions (modify staker's
 * balance).
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 *
 * @todo: options for confirmation threshold
 */
export function deliverWitness(tx: SignedWitnessTx, state: State): Vote {
    // Check structural validity
    let parsedWitnessTx: ParsedWitnessData;

    try {
        // parse valid event data (also validates)
        parsedWitnessTx = parseWitness(tx.data);

        // then try to match eventId
        let calcId = createWitnessEventHash({
            subject: tx.data.subject,
            type: tx.data.type,
            amount: tx.data.amount,
            block: tx.data.block,
            address: tx.data.address,
            publicKey: tx.data.publicKey
        });
       
        // confirm id in event matches hash of event data
        if (calcId !== tx.data.id) {
            throw new Error("reported eventId does not match actual");
        }
    } catch (error) {
        warn("mem", `invalid witness event rejected: ${error.message}`);
        return Vote.invalid();
    }

    // Unpack/parse event data
    const { subject, type, amount, block, address, publicKey, id } = parsedWitnessTx;

    switch (state.events.hasOwnProperty(block)) {
        // Block is already in state
        case true: {
            if (
                state.events[block].hasOwnProperty(id) &&
                state.events[block][id].amount === amount &&
                state.events[block][id].type === type
            ) {
                // Event is already in state, add confirmation
                state.events[block][id].conf += 1;
                updateMappings(state, id, address, block, amount, type);

                // Voted for valid existing event
                log("state", "vote recorded for valid stake event (existing)");
                return Vote.valid();

            } else if (!(state.events[block].hasOwnProperty(id))) {
                // Block in state, event is not
                state.events[block][id] = {
                    subject,
                    type,
                    address,
                    amount,
                    publicKey,
                    conf: 1
                };

                // If running with single node, update balances
                if (process.env.NODE_ENV === "development") {
                    updateMappings(state, id, address, block, amount, type);
                }

                // Voted for valid new event
                log("state", "voted added for valid stake event (new)");
                return Vote.valid();

            } else {
                // Block and event are in state, but does not match Tx
                warn("state", "witness tx does not match in-state event");
                return Vote.invalid();
            }
        }

        // Block is not already in state
        case false: {
            // Block is not in state yet, add new one
            state.events[block] = {};

            // Add event to block
            state.events[block][id] = {
                subject,
                type,
                address,
                amount,
                publicKey,
                conf: 1
            };

            // If running with single node, update balances
            if (process.env.NODE_ENV === "development") {
                updateMappings(state, id, address, block, amount, type);
            }

            // Added new event to state
            log("state", "voted added for valid stake event (new)");
            return Vote.valid();
        }

        // Shouldn't happen!
        default: {
            return Vote.invalid();
        }
    }
}
