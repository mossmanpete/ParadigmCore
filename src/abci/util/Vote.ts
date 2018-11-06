/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Vote.ts
 * @module src/abci
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  24-September-2018
 * @date (modified) 02-November-2018
 *
 * The Vote class represents a Tendermint ABCI response message.
 */

export class Vote {
    /*
        This class will be expanded with more errors for the
        different failure points in checkTx (and deliverTx).
    */
    public static valid(message?: string) {
        return {
            code: 0,
            log: message,
        };
    }

    public static invalid(message?: string) {
        return {
            code: 1,
            log: message,
        };
    }
}
