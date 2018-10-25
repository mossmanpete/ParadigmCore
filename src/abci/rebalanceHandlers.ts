/* 
  =========================
  ParadigmCore: Blind Star
  rebalanceHandlers.ts @ {dev}
  =========================

  @date_inital 23 October 2018
  @date_modified 23 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI Rebalance transactions. 
*/

import { Vote } from "src/util/Vote";
import { Logger } from "src/util/Logger";
import { StakeRebalancer } from "src/async/StakeRebalancer";
import { messages as msg } from "src/util/messages";

/**
 * @name checkRebalance() {export function} verify a Rebalance proposal before
 * accepting it into the local mempool. 
 * 
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkRebalance(tx: any, state: any) {
    let proposal = tx.data;

    switch (state.round.number) {
        case 0: {
            if (proposal.round.number === 1) {
                // Accept valid initial rebalance proposal to mempool

                Logger.mempool(msg.rebalancer.messages.iAccept);
                return Vote.valid();
            } else {
                // Reject invalid initial rebalance proposal from mempool

                Logger.mempoolWarn(msg.rebalancer.messages.iReject)
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
    let proposal = tx.data;

    switch (state.round.number) {
        case 0: {
            if (proposal.round.number === 1) {
                // Accept valid initial rebalance proposal to mempool

                // Begin state modification
                state.round.number += 1;
                state.round.startsAt = proposal.round.startsAt;
                state.round.endsAt = proposal.round.endsAt;
                // state.mappings.limits = proposal.mapping;

                Logger.consensus(msg.rebalancer.messages.iAccept);
                return Vote.valid();
            } else {
                // Reject invalid initial rebalance proposal from mempool

                Logger.consensusWarn(msg.rebalancer.messages.iReject)
                return Vote.invalid();
            }
        }

        default: {
            if ((1 + state.round.number) === proposal.round.number) {
                // Accept valid rebalance proposal to mempool 

                Logger.consensus(msg.rebalancer.messages.accept);
                return Vote.valid(msg.rebalancer.messages.accept);
            } else {
                // Reject invalid rebalance proposal from mempool

                Logger.consensusWarn(msg.rebalancer.messages.reject);
                return Vote.invalid(msg.rebalancer.messages.reject);
            }
        }
    }
}