/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Vote.ts
 * @module src/abci
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  24-September-2018
 * @date (modified) 04-December-2018
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
    public static valid(message?: string) {
        return {
            code: 0,
            log: message,
        };
    }

    /**
     * Represents a Tendermint INVALID tx response message.
     *
     * @param message {string} optional message
     */
    public static invalid(message?: string) {
        return {
            code: 1,
            log: message,
        };
    }
}
