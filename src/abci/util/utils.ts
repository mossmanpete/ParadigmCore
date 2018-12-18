/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name utils.ts
 * @module src/abci/util
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  04-December-2018
 * @date (modified) 18-December-2018
 *
 * ParadigmCore state machine (ABCI) utility functions – pure and non state-
 * modifying.
 */

// ParadigmCore classes
import { PayloadCipher } from "../../crypto/PayloadCipher";
import { err, log, warn } from "../../util/log";
import { TxGenerator } from "./TxGenerator";

/**
 * Verify validator signature, and confirm transaction originated from an
 * active validator.
 *
 * @param tx    {SignedTransaction} signed transaction object (decoded)
 * @param state {State}             current state
 * @param txGen {TxGenerator}       transaction generator instance
 */
export function preVerifyTx(
    tx: SignedTransaction,
    state: State,
    txGen: TxGenerator
): boolean {
    // Immediately invalidate if invalid signature
    if (!txGen.verify(tx)) { return false; }

    // Check that signing party is an active validator
    if (!state.validators.hasOwnProperty(tx.proof.fromAddr)) { return false; }

    // Above conditions pass mean tx is from active validator
    return true;
}

/**
 * Decode and decompress input transaction. Wrapper for PayloadCipher class.
 *
 * @param raw {Buffer} encoded/compressed raw transaction
 */
export function decodeTx(raw: Buffer): SignedTransaction {
    return PayloadCipher.ABCIdecode(raw);
}

/**
 * Verify an order conforms to max size requirement.
 *
 * @param order {paradigm.Order} paradigm order object
 *
 * @todo make size parameter an in-state parameter
 */
export function verifyOrder(order: any, max?: number): boolean {
    // Convert order => string => buffer and count bytes
    let orderBuf: Buffer = Buffer.from(JSON.stringify(order), "utf8");
    let maxSize: number = max || parseInt(process.env.MAX_ORDER_SIZE, 10);

    // Constrain to max size
    return (orderBuf.length <= maxSize);
}

/**
 * Generates a rate-limit mapping based on staked balances and the total order
 * limit per staking period.
 *
 * @param bals  {object} current in-state staked balances
 * @param limit     {number} the total number of orders accepted in the period
 */
export function genLimits(bals: Balances, limit: number): Limits {
    let total: bigint = BigInt(0);      // Total amount currently staked
    const output: Limits = {};          // Generated output mapping

    // Calculate total balance currently staked
    Object.keys(bals).forEach((k, v) => {
        if (bals.hasOwnProperty(k) && typeof(bals[k]) === "bigint") {
            total += bals[k];
        }
    });

    // Compute the rate-limits for each staker based on stake size
    Object.keys(bals).forEach((k, v) => {
        if (bals.hasOwnProperty(k) && typeof(bals[k]) === "bigint") {
            // Compute proportional order limit
            const bal = parseInt(bals[k].toString(), 10);
            const tot = parseInt(total.toString(), 10);
            const lim = (bal / tot) * limit;

            // Create limit object for each address
            output[k] = {
                // orderLimit is proportional to stake size
                orderLimit: Math.floor(lim),

                // streamLimit is always 1, regardless of stake size
                streamLimit: 1,
            };
        }
    });

    // Return constructed output mapping.
    return output;
}

/**
 * Apply event state transition of balances.
 *
 * @param state     {object}    current state object
 * @param staker    {string}    staker's address
 * @param amount    {number}    amount staked (or unstaked)
 * @param type      {string}    event type (add or remove)
 */
export function applyEvent(
    state: State,
    staker: string,
    amount: bigint,
    type: string
): void {
    switch (type) {
        // Staker is adding stake
        case "add": {
            state.balances[staker] += amount;
            break;
        }

        // Staker is removing stake
        case "remove": {
            state.balances[staker] -= amount;
            break;
        }

        // Unknown event type
        default: { return; }
    }

    // Return upon completion of updates
    return;
}

/**
 * Update state upon event confirmation
 *
 * @param state     {object}    current state object
 * @param staker    {string}    staker's address
 * @param block     {number}    relevant block height
 * @param amount    {number}    amount staked (or unstaked)
 * @param type      {string}    event type (stake made or removed)
 */
export function updateMappings(
    state: State,
    staker: string,
    block: number,
    amount: bigint,
    type: string
) {
    if (
        state.events.hasOwnProperty(block) &&
        state.events[block].hasOwnProperty(staker) &&
        state.events[block][staker].type === type &&
        state.events[block][staker].amount === amount
    ) {
        // Is this event now confirmed?
        if (state.events[block][staker].conf >=
            parseInt(process.env.CONF_THRESHOLD, 10)
        ) {
            log("state", "witness event confirmed, updating balances");

            // See if staker already has a balance
            switch (state.balances.hasOwnProperty(staker)) {
                // Staker already has balance, we are updating
                case true: {
                    applyEvent(state, staker, amount, type);
                    break;
                }

                // Staker does not have a current balance
                case false: {
                    state.balances[staker] = BigInt(0);
                    applyEvent(state, staker, amount, type);
                    break;
                }

                // Shouldn't happen!
                default: { return; }
            }

            // Remove events that were just applied to state
            delete state.events[block][staker];

            // Remove event block entry if empty
            if (Object.keys(state.events[block]).length === 0) {
                delete state.events[block];
            }

            // Remove balance entry if now empty
            if (state.balances[staker] === BigInt(0)) {
                delete state.balances[staker];
            }

            // Update highest event block accepted
            if (state.lastEvent[type] < block) {
                state.lastEvent[type] = block;
            }

            // Done
            return;
        } else {
            // Witness account added, but event is not confirmed yet
            log("state", "confirmation added for pending witness event");
            return;
        }
    } else {
        // Event in state does not match event TX
        warn("state", "disagreement about event data, potential failure");
        return;
    }
}

/**
 * Checks if a stake event is structurally valid. Considered
 * state-less verification (validity does not depend on state).
 *
 * @param data  {object}    the stake event to validate
 */
export function isValidStakeEvent(data: any, state: State): boolean {
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
        typeof(data.staker) !== "string" ||
        typeof(data.type) !== "string" ||
        typeof(data.block) !== "number" ||
        typeof(data.amount) !== "string" ||
        data.amount.slice(-1) !== "n"
    ) {
        return false;
    } else if (!(data.type === "add" || data.type === "remove")) {
        return false;
    } else if (data.block <= state.lastEvent[data.type]) {
        return false;
    } else {
        return true;
    }
}
