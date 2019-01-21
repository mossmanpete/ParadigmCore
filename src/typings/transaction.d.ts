/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name transaction.d.ts
 * @module src/typings
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  15-November-2018
 * @date (modified) 21-January-2019
 *
 * Type definitions for OrderStream transaction types.
 */

// Begin raw (unsigned) transaction definitions

/**
 * Unsigned ABCI transaction (nonspecific type).
 */
interface RawTransaction {
    type:   string;
    data:   TransactionData;
}

/**
 * Unsigned order broadcast ABCI transaction (type `order`).
 */
interface RawOrderTx extends RawTransaction {
    data:   OrderData;
}

/**
 * Unsigned event witness ABCI transaction (type `witness`).
 */
interface RawWitnessTx extends RawTransaction {
    data:   WitnessData;
}

/**
 * Unsigned rebalance ABCI transaction (type `rebalance`).
 */
interface RawRebalanceTx extends RawTransaction {
    data:   RebalanceData;
}

/**
 * Unsigned stream broadcast ABCI transaction (type `stream`).
 */
interface RawStreamTx extends RawTransaction {
    data:   StreamData;
}

// End of unsigned transaction definition.

// Begin signed transaction definitions.

/**
 * Signed ABCI transaction (nonspecific type).
 */
interface SignedTransaction {
    type:   string;
    data:   TransactionData;
    proof:  Proof;
}

/**
 * Signed order broadcast ABCI transaction (type `order`).
 */
interface SignedOrderTx extends SignedTransaction {
    data:   OrderData;
}

/**
 * Signed event witness ABCI transaction (type `witness`).
 */
interface SignedWitnessTx extends SignedTransaction {
    data:   WitnessData;
}

/**
 * Signed rebalance ABCI transaction (type `rebalance`).
 */
interface SignedRebalanceTx extends SignedTransaction {
    data:   RebalanceData;
}

/**
 * Signed stream broadcast ABCI transaction (type `stream`).
 */
interface SignedStreamTx extends SignedTransaction {
    data:   StreamData;
}

// End of signed transaction definitions.

/**
 * Proof object contains validator signature, and allows verification of 
 * transaction origin.
 */
interface Proof {
    from:       string;
    fromAddr:   string;
    signature:  string;
}

/** 
 * Nonspecific transaction data object.
 */
interface TransactionData {
    [key: string]: any;
}

/**
 * Transaction data interface for `order` type tx.
 */
interface OrderData extends TransactionData {
    maker?:             string;
    subContract:        string;
    makerArguments?:    Array<OrderArgument> | Array<null>;
    takerArguments?:    Array<OrderArgument>;
    makerValues:        OrderValues | object;
    takerValues?:       OrderValues;
    posterSignature:    OrderPosterSignature;
}

/**
 * Maker/taker argument definition for `order` type transactions.
 */
interface OrderArgument {
    name:       string;
    dataType:   string;
}

/**
 * Maker/taker value definition for `order` type transactions.
 */
interface OrderValues {
    [key: string]: any;
}

/**
 * Definition for poster signature objects.
 */
interface OrderPosterSignature {
    v:  number;
    r:  string;
    s:  string;
}

/**
 * Transaction data interface for `witness` type tx.
 */
interface WitnessData extends TransactionData {
    subject:    string; // 'poster' or 'validator'
    type:       string; // 'add' or 'remove'
    amount:     string; // stringified bigint
    block:      number; // block number of event
    address:    string; // ethereum address of validator/poster
    publicKey:  string | undefined; // tendermint ed25519 key of validator
    id?:        string; // hash of event data
}

/**
 * Transaction data interface for `rebalance` type tx.
 */
interface RebalanceData extends TransactionData {
    limits: Limits;
    round:  RoundInfo;
}

/**
 * Transaction data interface for `stream` type tx.
 * 
 * @todo define structure.
 */
interface StreamData extends TransactionData {
    [key: string]: any;
}
