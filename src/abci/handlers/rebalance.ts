/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name rebalance.ts
 * @module abci/handlers
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  23-October-2018
 * @date (modified) 01-November-2018
 *
 * Handler functions for verifying ABCI Rebalance transactions, originating
 * from validator nodes. Implements state transition logic as specified in the
 * spec for this TX type.
 */

// 3rd party and STDLIB imports
import * as _ from "lodash";

// ParadigmCore imports
import { StakeRebalancer } from "../../async/StakeRebalancer";
import { Logger } from "../../util/Logger";
import { messages as msg } from "../../util/static/messages";
import { Vote } from "../util/Vote";

/**
 * Verify a Rebalance proposal before accepting it into the local mempool.
 *
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkRebalance(tx: any, state: any) {
    const proposal = tx.data;

    switch (state.round.number) {
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
 * @name deliverRebalance() {export function} execute a Rebalance transaction
 * and adopt the new mapping in state.
 *
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 * @param rb {StakeRebalancer} the current rebalancer instance
 */
export function deliverRebalance(tx: any, state: any, rb: StakeRebalancer) {
    const proposal = tx.data;

    // Main verification switch block
    switch (state.round.number) {
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
                // state.mappings.limits = proposal.mapping;

                Logger.consensus(msg.rebalancer.messages.iAccept);
                return Vote.valid();
            } else {
                // Reject invalid initial rebalance proposal from mempool
                Logger.consensusWarn(msg.rebalancer.messages.iReject);
                return Vote.invalid();
            }
        }

        default: {
            if ((1 + state.round.number) === proposal.round.number) {
                // Limits from proposal
                const propLimits = proposal.limits;

                // Compute limits from in-state balances
                const localLimits = genLimits(state.balances, state.round.limit);

                // if (JSON.stringify(propLimits) === JSON.stringify(localLimits)) {
                if (_.isEqual(propLimits, localLimits)) {
                    // If proposed mapping matches mapping constructed from
                    // in state balances.

                    // Begin state modificiation
                    state.round.number += 1;
                    state.round.startsAt = proposal.round.startsAt;
                    state.round.endsAt = proposal.round.endsAt;
                    state.limits = proposal.limits;
                    // End state modification

                    Logger.consensus(msg.rebalancer.messages.accept);
                    return Vote.valid(msg.rebalancer.messages.accept);
                } else {
                    // Proposal does not match local mapping
                    Logger.consensusWarn(msg.rebalancer.messages.noMatch);
                    return Vote.invalid(msg.rebalancer.messages.noMatch);
                }

            } else if ((1 + state.round.number) < proposal.round.number) {
                // Proposal is for incorrect period
                Logger.consensusWarn(msg.rebalancer.messages.wrongRound);
                return Vote.invalid(msg.rebalancer.messages.wrongRound);

            } else {
                // Reject invalid rebalance proposal from mempool
                Logger.consensusWarn(msg.rebalancer.messages.reject);
                return Vote.invalid(msg.rebalancer.messages.reject);
            }
        }
    }
}

/**
 * @name genLimits()
 * @description Generates a rate-limit mapping based on staked balances and
 * the total order limit per staking period.
 *
 * @param bals  {object} current in-state staked balances
 * @param limit     {number} the total number of orders accepted in the period
 */
function genLimits(bals: any, limit: number): any {
    let total: any = BigInt(0); // total amount currenty staked
    const output: object = {}; // generated output mapping

    // Calculate total balance currently staked
    Object.keys(bals).forEach((k, v) => {
        if (bals.hasOwnProperty(k) && _.isEqual(typeof(bals[k]), "bigint")) {
            total += bals[k];
        }
    });

    // Compute the rate-limits for each staker based on stake size
    Object.keys(bals).forEach((k, v) => {
        if (bals.hasOwnProperty(k) && _.isEqual(typeof(bals[k]), "bigint")) {
            const pLimit: number = (bals[k].toNumber() /  total.toNumber());

            // Create limit object for each address
            output[k] = {
                // orderLimit is proportional to stake size
                orderLimit: Math.floor(pLimit * limit),

                // streamLimit is always 1, regardless of stake size
                streamLimit: 1,
            };
        }
    });

    // Return computed output mapping
    return output;
}
