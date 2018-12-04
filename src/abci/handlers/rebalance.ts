/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name rebalance.ts
 * @module src/abci/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 15-November-2018
 *
 * Handler functions for verifying ABCI Rebalance transactions, originating
 * from validator nodes. Implements state transition logic as specified in the
 * spec for this TX type.
 */

// 3rd party and STDLIB imports
import { isEqual } from "lodash";

// ParadigmCore imports
import { StakeRebalancer } from "../../async/StakeRebalancer";
import { Logger } from "../../util/Logger";
import { messages as msg } from "../../util/static/messages";
import { genLimits } from "../util/utils";
import { Vote } from "../util/Vote";

/**
 * Verify a Rebalance proposal before accepting it into the local mempool.
 *
 * @param tx    {SignedRebalanceTx} decoded transaction body
 * @param state {State}             current round state
 */
export function checkRebalance(tx: SignedRebalanceTx, state: State) {
    // Load proposal from rebalance tx
    const proposal: RebalanceData = tx.data;

    // Check if this is the initial rebalance period
    switch (state.round.number) {
        // No previous periods
        case 0: {
            if (proposal.round.number === 1) {
                // Accept valid initial rebalance proposal to mempool
                Logger.mempool(msg.rebalancer.messages.iAccept);
                return Vote.valid();
            } else {
                // Reject invalid initial rebalance proposal from mempool
                Logger.mempoolWarn(msg.rebalancer.messages.iReject);
                return Vote.invalid();
            }
        }

        // Not the first period (period > 0)
        default: {
            if ((1 + state.round.number) === proposal.round.number) {
                // Accept valid rebalance proposal to mempool
                Logger.mempool(msg.rebalancer.messages.accept);
                return Vote.valid(msg.rebalancer.messages.accept);
            } else {
                // Reject invalid rebalance proposal from mempool
                Logger.mempoolWarn(msg.rebalancer.messages.reject);
                return Vote.invalid(msg.rebalancer.messages.reject);
            }
        }
    }
}

/**
 * Execute a Rebalance transaction and adopt the new mapping in state.
 *
 * @param tx    {SignedRebalanceTx} decoded transaction body
 * @param state {State}             current round state
 * @param rb    {StakeRebalancer}   the current rebalancer instance
 */
export function deliverRebalance(
    tx: SignedRebalanceTx,
    state: State,
    rb: StakeRebalancer
) {
    const proposal: RebalanceData = tx.data;

    // Main verification switch block
    switch (state.round.number) {
        // Initial rebalance period
        case 0: {
            if (proposal.round.number === 1) {
                /**
                 * NOTE: no mapping is accepted until subsequent rebalance
                 * transactions are executed. The first proposal only serves to
                 * establish the parameters for the first staking period.
                 */

                // Begin state modification
                state.round.number += 1;
                state.round.startsAt = proposal.round.startsAt;
                state.round.endsAt = proposal.round.endsAt;

                // TODO: make sure limit is agreed upon
                state.round.limit = proposal.round.limit;
                // End state modification

                Logger.consensus(msg.rebalancer.messages.iAccept);
                return Vote.valid();
            } else {
                // Reject invalid initial rebalance proposal from mempool
                Logger.consensusWarn(msg.rebalancer.messages.iReject);
                return Vote.invalid();
            }
        }

        // All other periods (period > 0)
        default: {
            if ((1 + state.round.number) === proposal.round.number) {
                // Limits from proposal
                const propLimits = proposal.limits;

                // Compute limits from in-state balances
                const localLimits = genLimits(state.balances, state.round.limit);

                // TODO: add condition around period length
                if (isEqual(propLimits, localLimits)) {
                    // If proposed mapping matches mapping constructed from
                    // in state balances, we accept.

                    // Begin state modification
                    state.round.number += 1;
                    state.round.startsAt = proposal.round.startsAt;
                    state.round.endsAt = proposal.round.endsAt;
                    state.limits = proposal.limits;
                    // End state modification

                    // Vote to accept
                    Logger.consensus(msg.rebalancer.messages.accept);
                    return Vote.valid(msg.rebalancer.messages.accept);
                } else {
                    // Proposal does not match local mapping
                    Logger.consensusWarn(msg.rebalancer.messages.noMatch);
                    return Vote.invalid(msg.rebalancer.messages.noMatch);
                }

            // Proposal is for incorrect period
            } else if ((1 + state.round.number) < proposal.round.number) {
                Logger.consensusWarn(msg.rebalancer.messages.wrongRound);
                return Vote.invalid(msg.rebalancer.messages.wrongRound);

            // Reject invalid rebalance proposals
            } else {
                Logger.consensusWarn(msg.rebalancer.messages.reject);
                return Vote.invalid(msg.rebalancer.messages.reject);
            }
        }
    }
}
