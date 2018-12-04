/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name witness.ts
 * @module src/abci/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 15-November-2018
 *
 * Handler functions for verifying ABCI event Witness transactions,
 * originating from validator nodes. Implements state transition logic as
 * specified in the spec for this TX type.
 */

 // ParadigmCore classes
import { Logger } from "../../util/Logger";
import { Vote } from "../util/Vote";

// ParadigmCore utilities
import { isValidStakeEvent, updateMappings } from "../util/utils";

/**
 * Performs mempool verification of Ethereum StakeEvent transactions.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkWitness(tx: SignedWitnessTx, state: State): Vote {
    if (isValidStakeEvent(tx.data, state)) {
        Logger.mempool("Stake witness transaction accepted.");
        return Vote.valid("Stake witness transaction accepted.");
    } else {
        Logger.mempoolWarn("Invalid witness event rejected.");
        return Vote.invalid("Invalid witness event rejected.");
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
    if (!(isValidStakeEvent(tx.data, state))) {
        Logger.consensusWarn("Invalid witness event rejected.");
        return Vote.invalid();
    }

    // Unpack/parse event data
    const staker: string = tx.data.staker;
    const type: string = tx.data.type;
    const block: number = tx.data.block;

    // We must remove the trailing "n" from BigInt strings
    const amount: bigint = BigInt(tx.data.amount.slice(0, -1));

    switch (state.events.hasOwnProperty(block)) {
        // Block is already in state
        case true: {
            if (
                state.events[block].hasOwnProperty(staker) &&
                state.events[block][staker].amount === amount &&
                state.events[block][staker].type === type
            ) {
                // Event is already in state, add confirmation
                state.events[block][staker].conf += 1;
                updateMappings(state, staker, block, amount, type);

                // Voted for valid existing event
                Logger.consensus("Voted for valid stake event (existing).");
                return Vote.valid();

            } else if (!(state.events[block].hasOwnProperty(staker))) {
                // Block in state, event is not
                state.events[block][staker] = {
                    amount,
                    conf: 1,
                    type,
                };

                // If running with single node, update balances
                if (process.env.NODE_ENV === "development") {
                    updateMappings(state, staker, block, amount, type);
                }

                // Voted for valid new event
                Logger.consensus("Voted for new valid stake event.");
                return Vote.valid();

            } else {
                // Block and event are in state, but does not match Tx
                Logger.consensusWarn("Event Tx does not match event in state.");
                return Vote.invalid();
            }
        }

        // Block is not already in state
        case false: {
            // Block is not in state yet, add new one
            state.events[block] = {};

            // Add event to block
            state.events[block][staker] = {
                amount,
                conf: 1,
                type,
            };

            // If running with single node, update balances
            if (process.env.NODE_ENV === "development") {
                updateMappings(state, staker, block, amount, type);
            }

            // Added new event to state
            Logger.consensus("Voted for valid stake event (new).");
            return Vote.valid();
        }

        // Shouldn't happen!
        default: {
            return Vote.invalid();
        }
    }
}
