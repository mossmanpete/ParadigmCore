interface RawTransaction {
    type:   string;
    data:   TransactionData;
}

interface SignedTransaction {
    type:   string;
    data:   TransactionData;
    proof:  Proof;
}

interface RawOrderTx extends RawTransaction {
    data:   OrderData;
}

interface SignedOrderTx extends SignedTransaction {
    data:   OrderData;
}

interface RawWitnessTx extends RawTransaction {
    data:   WitnessData;
}

interface SignedWitnessTx extends SignedTransaction {
    data:   WitnessData;
}

interface RawRebalanceTx extends RawTransaction {
    data:   RebalanceData;
}

interface SignedRebalanceTx extends SignedTransaction {
    data:   RebalanceData;
}

interface RawStreamTx extends RawTransaction {
    data:   StreamData;
}

interface SignedStreamTx extends SignedTransaction {
    data:   StreamData;
}

interface Proof {
    from:       string;
    fromAddr:   string;
    signature:  string;
}

interface TransactionData {
    [key: string]: any;
}

interface OrderData extends TransactionData {
    maker:              string;
    subContract:        string;
    makerArguments:     Array<Argument> | Array<null>;
    takerArguments?:    Array<Argument> | Array<null>;
    makerValues:        OrderValues | object;
    takerValues?:       OrderValues | object;
    posterSignature:    PosterSignature;
}

interface WitnessData extends TransactionData {
    type:   string;
    amount: string;
    block:  number;
    staker: string;
}

interface RebalanceData extends TransactionData {
    limits: Limits;
    round:  RoundInfo;
}

// This structure is unknown
interface StreamData extends TransactionData {
    [key: string]: any;
}

interface Argument {
    name:       string;
    dataType:   string;
}

interface OrderValues {
    [key: string]: any;
}

interface PosterSignature {
    v:  number;
    r:  string;
    s:  string;
}