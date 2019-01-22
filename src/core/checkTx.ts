// utils and classes
import { TxGenerator } from "./util/TxGenerator";
import { ResponseCheckTx } from "../typings/abci";
import { decodeTx, preVerifyTx } from "./util/utils";
import { Vote } from "./util/Vote";
import { warn } from "../util/log";

// handlers
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
    msg: MasterLogTemplates,
    generator: TxGenerator,
    Order: any
): (r) => ResponseCheckTx {
    return (request) => {
        // Load transaction from request
        const rawTx: Buffer = request.tx;   // Encoded/compressed tx object
        let tx: SignedTransaction;          // Decoded tx object

        // Decode the buffered and compressed transaction
        try {
            tx = decodeTx(rawTx);
        } catch (error) {
            warn("mem", msg.abci.errors.decompress);
            return Vote.invalid(msg.abci.errors.decompress);
        }

        // Verify the transaction came from a validator
        if (!preVerifyTx(tx, state, generator)) {
            warn("mem", msg.abci.messages.badSig);
            return Vote.invalid(msg.abci.messages.badSig);
        }

        // Selects the proper handler verification logic based on the tx type.
        switch (tx.type) {
            // OrderBroadcast type transaction
            case "order": {
                return checkOrder(tx as SignedOrderTx, state, Order);
            }

            // StreamBroadcast type external transaction
            // @TODO implement
            case "stream": {
                return checkStream(tx as SignedStreamTx, state);
            }

            // Validator reporting witness to Ethereum event
            case "witness": {
                return checkWitness(tx as SignedWitnessTx, state);
            }

            // Rebalance transaction updates limit mapping
            case "rebalance": {
                return checkRebalance(tx as SignedRebalanceTx, state);
            }

            // Invalid transaction type
            default: {
                warn("mem", msg.abci.errors.txType);
                return Vote.invalid(msg.abci.errors.txType);
            }
        }
    };
}