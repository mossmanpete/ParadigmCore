interface InfoRequest {
    version: string;
    blockVersion: uint64;
    p2pVersion: uint64;
}

interface InfoResponse {
    data: string;
    version: string;
    lastBlockHeight: int64;
    lastBlockAppHash: Buffer;
}

interface int64 {
    low: number;
    high: number;
    unsigned: boolean;
}

interface uint64 extends int64 {}