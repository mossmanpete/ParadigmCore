// tslint:disable
interface RawTransaction {
    type:   string;
    data:   any;
}

interface SignedTransaction {
    type:   string;
    data:   any;
    proof:  Proof;
}

interface Proof {
    from:       string;
    fromAddr:   string;
    signature:  string;
}