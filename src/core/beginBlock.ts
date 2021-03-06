/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name beginBlock.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  21-January-2019
 * @date (modified) 22-January-2019
 *
 * ABCI beginBlock implementation.
*/

// custom typings
import { ResponseBeginBlock } from "../typings/abci";

// util functions
import { computeConf } from "./util/utils";
import { bigIntReplacer } from "../util/static/bigIntUtils";
import { log } from "../util/log";
import { doForEachValidator } from "./util/valFunctions";

/**
 * Called at the beginning of each new block. Updates proposer and block height.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
export function beginBlockWrapper(state: State): (r) => ResponseBeginBlock {
    return (request) => {
        // parse height and proposer from header
        const currHeight: number = Number(request.header.height);
        const proposer: string = request.header.proposerAddress.toString("hex");

        // store array of last votes
        const lastVotes: object[] | undefined = request.lastCommitInfo.votes;

        // parse validators that voted on the last block, update values
        if (lastVotes !== undefined && lastVotes.length > 0) {
            lastVotes.forEach((vote: any) => {
                // pull/parse nodeId and current vote power
                const nodeId = vote.validator.address.toString("hex");
                const power = Number(vote.validator.power);

                // TODO: sould we check for new validators here?

                // update vote and height trackers
                if (vote.signedLastBlock) {
                    state.validators[nodeId].totalVotes += 1;
                    state.validators[nodeId].lastVoted = (currHeight - 1);
                }

                // record if validator was active last round
                state.validators[nodeId].active = vote.signedLastBlock;

                // record if they are proposer this round
                if (nodeId === proposer) {
                    state.validators[nodeId].lastProposed = currHeight;
                }

                // update (or re-record) validator vote power
                state.validators[nodeId].power = power;

                /**
                 * TEMPORARY
                 * @todo remove
                 */
                if (state.validators[nodeId].genesis) {
                    state.validators[nodeId].ethAccount = "0x0";
                }
            });

            // update inactive validators
            doForEachValidator(state, (key) => {
                // current validator
                const validator = state.validators[key];

                // mark active if vote recorded on last block
                if ((validator.lastVoted + 1) === currHeight) {
                    validator.active = true;
                } else {
                    validator.active = false;
                }
            });
        }

        // update confirmation threshold based on number of active validators
        // confirmation threshold is >=2/3 active validators, unless there is
        // only one active validator, in which case it MUST be 1 in order for
        // state.balances to remain accurate.
        state.consensusParams.confirmationThreshold = computeConf(lastVotes.length);

        // Indicate new round, return no indexing tags
        log(
            "state",
            `current proposer: ${proposer.slice(0,5)}...${proposer.slice(-5)}`,
            currHeight
        );
        return {};
    };
}