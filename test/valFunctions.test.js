// Import functions to test
let { pubToAddr, privToPub } = require("../dist/util/static/valFunctions");

// To manually construct address for benchmark
let { createHash } = require("crypto");

// Raw string keys
let addrStr;
let pubStr;
let privStr;

// Encoded keys
let addr;
let pub;
let priv;

beforeAll(() => {
    // Load raw strings (all from one keypair)
    addrStr = "7998EAA73AF5187EE58432E9808A44E1E045DA03";
    pubStr = "2IeB+DT40jtqOGJF0Vl7EC8Y3+2eL/EG2Fg+oZRFAwA=";
    privStr = "g3lInKfcm3+AVFE9pDLp9h/ydnHFw6MIYqv6QU4FPNbYh4H4NPjSO2o4YkXRWXsQLxjf7Z4v8QbYWD6hlEUDAA==";

    // Load buffered/encoded versions
    addr = Buffer.from(addrStr, "hex");    // Address bytes
    pub = Buffer.from(pubStr, "base64");   // Pub key bytes
    priv = Buffer.from(privStr, "base64"); // Priv key bytes
});

describe("Sanity checks:", () => {
    test("buffered address equals input address string", () => {
        expect(addr.toString("hex")).toEqual(addrStr.toLowerCase());
    });

    test("buffered public key equals input public key string", () => {
        expect(pub.toString("base64")).toEqual(pubStr);
    });

    test("buffered private key equals input private key string", () => {
        expect(priv.toString("base64")).toEqual(privStr);
    });

    test("public key is equal to the last 32 bytes of private key", () => {
        expect(priv.slice(32, 64)).toEqual(pub);
    });

    test("address generated from pub key is equal to input address", () => {
        // Manually generate address from public key
        const manAddr = createHash("sha256").update(pub).digest("hex").slice(0,40);
        expect(manAddr).toEqual(addrStr.toLowerCase());
    });

    test("address generated from random key is not equal to address", () => {
        // Manually generate address from random public key
        const manAddr = createHash("sha256").
            update(Buffer.allocUnsafe(32)).
            digest("hex").
            slice(0,40);

        expect(manAddr).not.toEqual(addrStr.toLowerCase());
    });
});

describe("Function tests:", () => {
    describe("Function 'pubToAddr()' Tests:", () => {
        test("public key input returns correct address", () => {
            let compAddr = pubToAddr(pub);

            // computed address should equal provided address
            expect(compAddr).toEqual(addr);
        });

        test("throws with wrong input type", () => {
            // String input
            expect(() => { pubToAddr("hi"); }).toThrow("bad input type");

            // Number input
            expect(() => { pubToAddr(5); }).toThrow("bad input type");

            // Boolean input
            expect(() => { pubToAddr(true); }).toThrow("bad input type");

            // Array input
            expect(() => { pubToAddr([1,2,3]); }).toThrow("bad input type");

            // Object literal input
            expect(() => { pubToAddr({1:2}); }).toThrow("bad input type");

            // Valid input (sanity check)
            expect(() => { pubToAddr(pub); }).not.toThrow();
        });

        test("throws with invalid input length", () => {
            // Private key input
            expect(() => {
                pubToAddr(priv);
            }).toThrow("expected input to be 32 bytes");

            // Input buffer <32 bytes
            expect(() => {
                pubToAddr(Buffer.allocUnsafe(31));
            }).toThrow("expected input to be 32 bytes");

            // Input buffer >32 bytes
            expect(() => {
                pubToAddr(Buffer.allocUnsafe(64));
            }).toThrow("expected input to be 32 bytes");

            // Sanity check
            expect(() => { pubToAddr(pub); }).not.toThrow();
        });
    });

    describe("Function 'privToPub()' Tests:", () => {
        test("input private key returns correct public key", () => {
            let compPub = privToPub(priv);
            expect(compPub).toEqual(pub);
        });

        test("throws with wrong input type", () => {
            // String input
            expect(() => { privToPub("hi"); }).toThrow("bad input type");

            // Number input
            expect(() => { privToPub(5); }).toThrow("bad input type");

            // Boolean input
            expect(() => { privToPub(true); }).toThrow("bad input type");

            // Array input
            expect(() => { privToPub([1,2,3]); }).toThrow("bad input type");

            // Object literal input
            expect(() => { privToPub({1:2}); }).toThrow("bad input type");

            // Valid input (sanity check)
            expect(() => { privToPub(priv); }).not.toThrow();
        });

        test("throws with invalid input length", () => {
            // Public key input
            expect(() => {
                privToPub(pub);
            }).toThrow("expected input to be 64 bytes");

            // Input random buffer <64 bytes
            expect(() => {
                privToPub(Buffer.allocUnsafe(60));
            }).toThrow("expected input to be 64 bytes");

            // Input random buffer >64 bytes
            expect(() => {
                privToPub(Buffer.allocUnsafe(128));
            }).toThrow("expected input to be 64 bytes");

            // Sanity check
            expect(() => { privToPub(priv); }).not.toThrow();
        });
    });
});
