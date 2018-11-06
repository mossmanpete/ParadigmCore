// Avoids compiler warnings when using ESnext BigInt

interface BigInt extends Number {
    // Normal BigInt interface
    toString(): string;

    // Functions I have overridden
    toNumber(): number;
    toJSON(): string;
}

interface BigIntConstructor {
    new(value?: any): BigInt;
    (value?: any): BigInt;

    readonly prototype: BigInt;

    fromString(value?: string): BigInt;
}

declare const BigInt: BigIntConstructor;