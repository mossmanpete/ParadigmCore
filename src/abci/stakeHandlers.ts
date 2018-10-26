/* 
  =========================
  ParadigmCore: Blind Star
  stakeHandlers.ts @ {dev}
  =========================

  @date_inital 23 October 2018
  @date_modified 23 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI Event Transactions. 
*/
import { Logger } from "src/util/Logger";
import { Vote } from "src/util/Vote";

/**
 * @name checkStake() {export function} use to perform mempool verification of
 * Ethereum StakeEvent transactions.
 * 
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkStake(tx: any, _: any): Vote {
    if (isValidStakeEvent(tx.data)) {
        Logger.mempool("Stake witness transaction accepted.");
        return Vote.valid("Stake witness transaction accepted.");
    } else {
        Logger.mempoolWarn("Invalid witness event rejected.");
        return Vote.invalid("Invalid witness event rejected.");
    }
}

/**
 * @name deliverStake() {export function} perform state modification of Stake
 * Event transactions (modify staker's balance).
 * 
 * @param tx    {object} decoded transaction body
 * @param state {object} current round state
 * 
 * @todo: options for confirmation threshold
 * @todo: refactor and write some helper funcs, this is ugly
 */
export function deliverStake(tx: any, state: any): Vote {
    if (isValidStakeEvent(tx.data)) {
        // Stake event is structurally and syntactically valid
        
        let staker: string = tx.data.staker;
        let type: string = tx.data.type;
        let block: string = tx.data.block.toString();
        let amount: number = tx.data.amount;

        if (state.events.hasOwnProperty(block)) {
            if(
            state.events[block].hasOwnProperty(staker) &&
            state.events[block][staker].amount === amount) {
                // Event has already been added, we are just voting

                state.events[block][staker].conf += 1;
                if (state.events[block][staker].conf >= 5) {
                    // This vote was the final confirmation

                    switch (state.balances.hasOwnProperty(staker)) {
                        case true: {
                            if (type === "add") {
                                state.balances[staker] += amount;
                            } else if (type === "remove") {
                                state.balances[staker] -= amount;
                            }
                            delete state.events[block][staker];
                            break;
                        }
                        case false: {
                            if (type !== "add") {
                                Logger.consensusWarn("Potential consensus failure.");
                            }
                            state.balances[staker] = amount;
                            delete state.events[block][staker];
                            break;
                        }
                        default: { break; }
                    }

                    Logger.consensus("Stake event confirmed, balances updated.");
                    return Vote.valid();
                } else {
                    Logger.consensus(
                        "Witness transaction approved for pending event.");
                    return Vote.valid();
                }
            } else if (!(state.events[block].hasOwnProperty(staker))) {
                // Block is in state, but event is not

                state.events[block][staker] = {
                    "amount": amount,
                    "type": type,
                    "conf": 1
                };

                Logger.consensus("Witness transaction approved for new event.");
                return Vote.valid();   
            } else {
                Logger.consensusWarn("Disagreement about event parameters.");
                return Vote.invalid("Disagreement about event parameters.");
            }
        } else {
            // Event block is not already in state

            state.events[block] = {};
            state.events[block][staker] = {
                "amount": amount,
                "type": type,
                "conf": 1
            };

            Logger.consensus("Witness transaction approved for new event.");
            return Vote.valid();
        }
    } else {
        // Invalid event

        Logger.consensusWarn("Invalid witness event rejected.");
        return Vote.invalid("Invalid witness event rejected.");
    }
}

function isValidStakeEvent(data): boolean {
    // TODO: add info about proposer to validation condition

    if (
        !(data.hasOwnProperty("staker") &&
        data.hasOwnProperty("type") &&
        data.hasOwnProperty("block") &&
        data.hasOwnProperty("amount") &&
        Object.keys(data).length === 4)
    ) {
        return false;
    } else if (
        typeof(data.staker) !== 'string' ||
        typeof(data.type) !== 'string' ||
        typeof(data.block) !== 'number' ||
        typeof(data.amount) !== 'number'
    ) {
        return false;
    } else {
        return true;
    } 
}