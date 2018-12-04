// Import TxGenerator class
const TxGen = require("../dist/abci/util/TxGenerator").TxGenerator;

// Dummy Tendermint Keys (encoded in hex)
const privStr = '489ad37b451f4bd2baa077e39451fd16cab9d048ea9a19334de5bf552f8460b7da38c90ac19b29f107b0b344245c3795500ba24abe643456fc33dfe1d5e91b05';
const pubStr = 'da38c90ac19b29f107b0b344245c3795500ba24abe643456fc33dfe1d5e91b05';

// Keypair buffers
const priv = Buffer.from(privStr, "hex");
const pub = Buffer.from(pubStr, "hex");

// "Valid" transactions
let vWitness = {
    type: "witness",
    data: {
        type: "add",
        amount: "1000n",
        block: 4350451,
        staker: "0x..."
    }
};

let vOrder = {
    type: "order",
    data: {
        maker: "0x1329817239817",
        subContract: "0xjsahdkjhas87123",
        posterSignature: { v: "v", r: "r", s: "s" }
    }
};

let vRebalance = {
    type: "rebalance",
    data: {
        limits: { a: 1 },
        round: {
            endsAt: 1,
            startsAt: 2,
            number: 3,
            limit: 4
        }
    }
};

// "Invalid" transactions
let iTx = {
    type: "invalid",
    data: "nope"
};

let iWitness = {
    type: "witness",
    data: {
        type: "add",
        amount: "1000n",
        block: "4350451",
    }
};

let iOrder = {
    type: "order",
    data: {
        maker: "0x1329817239817",
        subContract: "0xjsahdkjhas87123",
    }
};

let iRebalance = {
    type: "rebalance",
    data: {
        limits: "{ a: 1 }",
        round: {
            endsAt: 1,
            startsAt: 2,
            number: 3,
            limit: 4,
            extra: 5
        }
    }
};

// Tests

describe("Static methods tests:", () => {
    // Create array of valid and invalid raw transactions
    let vTxs = [vOrder, vRebalance, vWitness];
    let iTxs = [iOrder, iRebalance, iWitness, iTx];
    
    test("method 'isValidInput()' returns 'true' for valid inputs", () => {
        // Iterate over valid Tx objects and test validity
        vTxs.forEach(validTx => {
            expect(TxGen.isValidInput(validTx)).toBe(true);
        });
    });

    test("method 'isValidInput()' returns 'false' for invalid inputs", () => {
        // Iterate over invalid Tx objects and test validity
        iTxs.forEach(invalidTx => {
            expect(TxGen.isValidInput(invalidTx)).toBe(false);
        });
    });

});

describe("Constructor tests:", () => {
    test("constructor throws with no options", () => {
        expect(() => {
            new TxGen()
        }).toThrow();
    });

    test("constructor throws with invalid encoding", () => {
        expect(() => {
            new TxGen({
                encoding: "42",
                privateKey: priv.toString("base64"),
                publicKey: pub.toString("base64")
            })
        }).toThrow();
    });

    test("constructor throws with invalid keypair", () => {
        expect(() => {
            new TxGen({
                encoding: "hex",
                privateKey: pub.toString("base64"),
                publicKey: priv.toString("base64")
            })
        }).toThrow();
    });
});

describe("Create and verify signed transactions:", () => {
    // Generators
    let hexGenerator;
    let base64Generator;

    // Transactions
    let tx64Arr = [];
    let txHexArr = [];

    // Create array of valid, invalid, and all raw transactions
    let vTxs = [vOrder, vRebalance, vWitness];
    let iTxs = [iOrder, iRebalance, iWitness, iTx];
    let aTxs = vTxs.concat(iTxs);

    // Build generators
    test("constructor does not throw with valid options", () => {
        expect(() => {
            // Create a generator using hex encoding
            hexGenerator = new TxGen({
                encoding: "hex",
                privateKey: priv.toString("base64"),
                publicKey: pub.toString("base64")
            });

            // Create a generator using base64 encoding
            base64Generator = new TxGen({
                encoding: "base64",
                privateKey: priv.toString("base64"),
                publicKey: pub.toString("base64")
            });
        }).not.toThrow();
    });

    test("generators are instances of the TransactionGenerator class", () => {
        expect(hexGenerator).toBeInstanceOf(TxGen);
        expect(base64Generator).toBeInstanceOf(TxGen);
    });

    test("generator fails creating tx's and throws with invalid inputs", () => {
        // Iterate over invalid Tx's, and try to create with each generator
        iTxs.forEach(invalidTx => {
            expect(() => { base64Generator.create(invalidTx) }).toThrow();
            expect(() => { hexGenerator.create(invalidTx) }).toThrow();
        });
    });

    test("generator successfully creates tx's with valid input", () => {
        expect(() => {
            // Iterate over valid raw Tx's, and create signed Tx's
            vTxs.forEach(validTx => {
                tx64Arr.push(base64Generator.create(validTx));
                txHexArr.push(hexGenerator.create(validTx));
            });
        }).not.toThrow();
    });

    test("generated transactions are now signed", () => {
        // Signed Tx arrays shouldn't be empty
        expect(tx64Arr.length).toBeGreaterThan(0);
        expect(txHexArr.length).toBeGreaterThan(0);

        // Test base64 transactions
        tx64Arr.forEach(signedTx => {
            expect(signedTx).toHaveProperty("proof");
        });

         // Test hexadecimal transactions
         tx64Arr.forEach(signedTx => {
            expect(signedTx).toHaveProperty("proof");
        });
    });

    test("generator.verify(tx) returns 'true' for valid signed tx's", () => {
        // Verify hexadecimal tx's
        txHexArr.forEach(signedTx => {
            expect(hexGenerator.verify(signedTx)).toBe(true);
            expect(base64Generator.verify(signedTx)).toBe(false);
        });

        // Verify base64 tx's
        tx64Arr.forEach(signedTx => {
            expect(base64Generator.verify(signedTx)).toBe(true);
            expect(hexGenerator.verify(signedTx)).toBe(false);
        });
    });

    test("generator.verify(tx) returns 'false' for unsigned tx's", () => {
        // Iterate over all unsigned raw Txs and try to verify
        aTxs.forEach(unsignedTx => {
            expect(base64Generator.verify(unsignedTx)).toBe(false);
            expect(hexGenerator.verify(unsignedTx)).toBe(false);
        });
    });
});
