// tslint:disable

interface StakeEvent {
    type:   string;
    staker: string;
    block:  number;
    amount: BigInt;
}