// Avoids compiler warnings when using ESnext BigInt

type BigInt = number;
declare const BigInt: typeof Number;