/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name checkTx.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  21-January-2019
 * @date (modified) 22-January-2019
 *
 * ABCI checkTx implementation.
*/

// custom typings
import { ResponseCheckTx } from "../typings/abci";

// util functions
import { Vote } from "./util/Vote";
import { warn } from "../util/log";
import { decodeTx, preVerifyTx } from "./util/utils";

// tx handlers
import { checkOrder } from "./handlers/order";
import { checkStream } from "./handlers/stream";
import { checkWitness } from "./handlers/witness";
import { checkRebalance } from "./handlers/rebalance";

/**
 * Perform light verification on incoming transactions, accept valid
 * transactions to the mempool, and reject invalid ones.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
export function checkTxWrapper(
    state: State,
    msg: LogTemplates,
    Order: any
): (r) => ResponseCheckTx {
    return (request) => {
        // load transaction from request
        const rawTx: Buffer = request.tx;   // Encoded/compressed tx object
        let tx: SignedTransaction;          // Decoded tx object

        // decode the buffered and compressed transaction
        try {
            tx = decodeTx(rawTx);
        } catch (error) {
            warn("mem", msg.abci.errors.decompress);
            return Vote.invalid(msg.abci.errors.decompress);
        }

        // verify the transaction came from a validator
        if (!preVerifyTx(tx, state)) {
            warn("mem", msg.abci.messages.badSig);
            return Vote.invalid(msg.abci.messages.badSig);
        }

        // select the proper handler verification logic based on the tx type
        switch (tx.type) {
            // sumbission of an 'order' tx (external)
            case "order": {
                return checkOrder(tx as SignedOrderTx, state, Order);
            }

            // sumbission of a 'stream' tx (external)
            // @TODO implement
            case "stream": {
                return checkStream(tx as SignedStreamTx, state);
            }

            // validator reporting witness to Ethereum event (internal)
            case "witness": {
                return checkWitness(tx as SignedWitnessTx, state);
            }

            // rebalance transaction updates poster allocation (internal)
            case "rebalance": {
                return checkRebalance(tx as SignedRebalanceTx, state);
            }

            // invalid/unknown transaction type
            default: {
                warn("mem", msg.abci.errors.txType);
                return Vote.invalid(msg.abci.errors.txType);
            }
        }
    };
}