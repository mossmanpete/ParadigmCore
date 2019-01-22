/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name witness.ts
 * @module src/core/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 22-January-2019
 *
 * Handler functions for verifying ABCI event Witness transactions,
 * originating from validator nodes. Implements state transition logic as
 * specified in the spec for this TX type.
 */

 // ParadigmCore classes
import { log, warn } from "../../util/log";
import { Vote } from "../util/Vote";

// ParadigmCore utilities/types
import { ParsedWitnessData } from "../../typings/abci";
import {
    parseWitness,
    updateMappings,
    createWitnessEventHash
} from "../util/utils";

/**
 * Performs mempool verification of Ethereum StakeEvent transactions. Condition
 * for validity is purely structural. I.E. are all necessary parameters present?
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
 */
export function deliverWitness(tx: SignedWitnessTx, state: State): Vote {
    // will store parsed event data (after validation)
    let parsedTx: ParsedWitnessData;

    try {
        // parse valid event data (also validates)
        parsedTx = parseWitness(tx.data);

        // compute hash of event as ID to confirm validity
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

    // unpack/parse event data after id is confirmed
    const { subject, type, amount, block, address, publicKey, id } = parsedTx;

    // @todo implement an outer level switch block to check for tx.subject

    // apply transition depending on if event is already in state or not
    switch (state.events.hasOwnProperty(block)) {
        case true: {
            // events from this block already pending, see if new must be added
            if (
                state.events[block].hasOwnProperty(id) &&
                state.events[block][id].amount === amount &&
                state.events[block][id].type === type
            ) {
                // event is already in state, add confirmation
                state.events[block][id].conf += 1;
                updateMappings(state, id, address, block, amount, type);
                log("state", "vote recorded for valid stake event (existing)");
                return Vote.valid();

            // block in state, event is not    
            } else if (!(state.events[block].hasOwnProperty(id))) {
                state.events[block][id] = {
                    subject,
                    type,
                    address,
                    amount,
                    publicKey,
                    conf: 1
                };

                // if running with single node, update balances
                if (process.env.NODE_ENV === "development") {
                    updateMappings(state, id, address, block, amount, type);
                }

                // voted added for valid new event
                log("state", "voted added for valid stake event (new)");
                return Vote.valid();
            } else {
                // Block and event are in state, but does not match Tx
                warn("state", "witness tx does not match in-state event");
                return Vote.invalid();
            }
        }

        case false: {
            // block is not in state yet, add new one
            state.events[block] = {};

            // add event to block
            state.events[block][id] = {
                subject,
                type,
                address,
                amount,
                publicKey,
                conf: 1
            };

            // if running with single node, update balances
            if (process.env.NODE_ENV === "development") {
                updateMappings(state, id, address, block, amount, type);
            }

            log("state", "voted added for valid stake event (new)");
            return Vote.valid();
        }

        // shouldn't happen, safety
        default: {
            return Vote.invalid();
        }
    }
}
