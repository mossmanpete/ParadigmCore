/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name utils.ts
 * @module src/abci/util
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  04-December-2018
 * @date (modified) 04-December-2018
 *
 * ParadigmCore state machine (ABCI) utility functions – pure and non state-
 * modifying.
 */

// ParadigmCore classes
import { PayloadCipher } from "../../crypto/PayloadCipher";
import { TxGenerator } from "./TxGenerator";

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

export function decodeTx(raw: Buffer): SignedTransaction {
    return PayloadCipher.ABCIdecode(raw);
}

/**
 * @name genLimits()
 * @description Generates a rate-limit mapping based on staked balances and
 * the total order limit per staking period.
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
