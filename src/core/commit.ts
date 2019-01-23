/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name commit.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  21-January-2019
 * @date (modified) 21-January-2019
 *
 * ABCI commit implementation.
*/

// paradigmcore classes/types
import { OrderTracker } from "../async/OrderTracker";
import { Witness } from "../async/Witness";
import { Hasher } from "../crypto/Hasher";

// custom typings
import { ResponseCommit } from "../typings/abci";

// util functions
import { syncStates } from "./util/utils";
import { log, err, warn } from "../util/log";
import { bigIntReplacer } from "../util/static/bigIntUtils";

/**
 * Persist application state, synchronize commit and deliver states, and
 * trigger the broadcast of valid orders in that block.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
export function commitWrapper(
    deliverState: State,
    commitState: State,
    tracker: OrderTracker,
    msg: LogTemplates,
    witness: Witness
): () => ResponseCommit {
    return () => {
        // store string encoded state hash
        let stateHash: Buffer;

        // perform commit responsibilities
        try {
            // Calculate difference between cState and dState round height
            const roundDiff = deliverState.round.number - commitState.round.number;

            switch (roundDiff) {
                // No rebalance proposal accepted in this round
                case 0: { break; }

                // Rebalance proposal accepted in this round
                case 1: {
                    // Load round parameters from state
                    const newRound = deliverState.round.number;
                    const newStart = deliverState.round.startsAt;
                    const newEnd = deliverState.round.endsAt;

                    // Synchronize staking period parameters
                    witness.synchronize(newRound, newStart, newEnd);

                    // Temporary
                    console.log(`\n... current state: ${JSON.stringify(commitState, bigIntReplacer)}\n`);
                    break;
                }

                default: {
                    // Commit state is more than 1 round ahead of deliver state
                    warn("state", msg.abci.messages.roundDiff);
                    break;
                }
            }

            // Increase last block height
            deliverState.lastBlockHeight += 1n;

            // Generate new state hash and update
            stateHash = Hasher.hashState(deliverState);
            deliverState.lastBlockAppHash = stateHash;

            // Trigger broadcast of orders and streams
            tracker.triggerBroadcast();

            // Synchronize commit state from delivertx state
            syncStates(deliverState, commitState);

            log(
                "state",
                `new state hash: ` + 
                `${stateHash.toString("hex").slice(0,5)}...` +
                `${stateHash.toString("hex").slice(-5)}`,
                commitState.lastBlockHeight
            );
        } catch (error) {
            err("state", `${msg.abci.errors.broadcast}: ${error.message}`);
        }

        // Return state's hash to be included in next block header
        return { data: stateHash };
    };
}