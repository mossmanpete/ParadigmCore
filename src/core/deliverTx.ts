/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name deliverTx.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  21-January-2019
 * @date (modified) 22-January-2019
 *
 * ABCI deliverTx implementation.
*/

// custom typings
import { ResponseDeliverTx } from "../typings/abci";
import { OrderTracker } from "../async/OrderTracker";

// util functions
import { Vote } from "./util/Vote";
import { warn } from "../util/log";
import { decodeTx, preVerifyTx } from "./util/utils";

// tx handlers
import { deliverOrder } from "./handlers/order";
import { deliverStream } from "./handlers/stream";
import { deliverWitness } from "./handlers/witness";
import { deliverRebalance } from "./handlers/rebalance";

/**
 * Execute a transaction in full: perform state modification, and verify
 * transaction validity.
 *
 * @param request {object} raw transaction as delivered by Tendermint core.
 */
export function deliverTxWrapper(
    state: State,
    msg: LogTemplates,
    tracker: OrderTracker,
    Order: any
): (r) => ResponseDeliverTx {
    return (request) => {
        // load transaction from request
        const rawTx: Buffer = request.tx;   // Encoded/compressed tx object
        let tx: SignedTransaction;          // Decoded tx object

        // decode the buffered and compressed transaction
        try {
            tx = decodeTx(rawTx);
        } catch (error) {
            warn("state", msg.abci.errors.decompress);
            return Vote.invalid(msg.abci.errors.decompress);
        }

        // verify the transaction came from a validator
        if (!preVerifyTx(tx, state)) {
            warn("state", msg.abci.messages.badSig);
            return Vote.invalid(msg.abci.messages.badSig);
        }

        // select the proper handler verification logic based on the tx type.
        switch (tx.type) {
            // OrderBroadcast type transaction
            case "order": {
                return deliverOrder(tx as SignedOrderTx, state, tracker, Order);
            }

            // StreamBroadcast type external transaction
            // @TODO implement
            case "stream": {
                return deliverStream(tx, state, tracker);
            }

            // Validator reporting witness to Ethereum event
            case "witness": {
                return deliverWitness(tx as SignedWitnessTx, state);
            }

            // Rebalance transaction updates limit mapping
            case "rebalance": {
                return deliverRebalance(tx as SignedRebalanceTx, state);
            }

            // Invalid transaction type
            default: {
                warn("state", msg.abci.errors.txType);
                return Vote.invalid(msg.abci.errors.txType);
            }
        }
    };
}