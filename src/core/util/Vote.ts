/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Vote.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  24-September-2018
 * @date (modified) 21-December-2018
 *
 * The Vote class represents a Tendermint ABCI response message.
 */

/**
 * Contains static methods for responding to checkTx() and deliverTx().
 */
export class Vote {
    /**
     * Represents a Tendermint VALID tx response message.
     *
     * @param message {string} optional message
     */
    public static valid(log?: string, tags?: KVPair[]) {
        // basic response object
        const res = { code: 0, log, };

        // add tags if present
        if (tags && tags.length > 0) res["tags"] = tags;
        return res;
    }

    /**
     * Represents a Tendermint INVALID tx response message.
     *
     * @param message {string} optional message
     */
    public static invalid(log?: string, tags?: KVPair[]) {
         // basic response object
         const res = { code: 1, log, };
         return res;
    }
}
