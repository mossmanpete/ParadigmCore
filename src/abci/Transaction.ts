/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Transaction.ts
 * @module abci
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  01-November-2018
 * @date (modified) 02-November-2018
 *
 * A class representing an ABCI transaction from a validator. Implements
 * ed25519 signatures from Tendermint validator keypairs.
 *
 * @TODO convert to TransactionGenerator that loads private keys only once
 * upon initialization.
 */

// Ed25519 signature implementation
import * as ed25519 from "ed25519";

export class Transaction {

    public static verify(tx: any): boolean {
        let msg: Buffer;    // Raw message buffer
        let sig: Buffer;    // Signature buffer
        let pub: Buffer;    // Public key buffer

        let isValid: boolean; // Result of verification

        try {
            // Buffer and encode message, signature, and public key
            msg = Buffer.from(JSON.stringify(tx.data), "utf8");
            sig = Buffer.from(tx.proof.signature, "base64");
            pub = Buffer.from(tx.proof.from, "base64");

            // Verify signature
            isValid = ed25519.Verify(msg, sig, pub);
        } catch (err) {
            return false;
        }

        // Confirm Verify() function return boolean
        if (typeof(isValid) !== "boolean") { return false; }

        // Otherwise, return result
        return isValid;
    }

    /* End static methods. */

    // Transaction parameters
    private type: string;   // ABCI transaction type (order, rebalance, etc)
    private data: any;      // Actual transaction data (arbitrary)
    private proof: any;     // Proof object with signature

    // Keypair object (keypair.priv & keypair.pub)
    private keypair: any;

    constructor(type: string, data: any) {
        // Validate Tx type
        switch (type) {
            case "order": { break; }
            case "stream": { break; }
            case "witness": { break; }
            case "rebalance": { break; }
            default: {
                throw new Error("Invalid transaction type.");
            }
        }

        // Destructure keys from environment
        const { PRIV_KEY, PUB_KEY } = process.env;

        // Buffer and encode keys
        this.keypair = {
            priv:   Buffer.from(PRIV_KEY, "base64"),
            pub:    Buffer.from(PUB_KEY, "base64"),
        };

        // Verify keypair
        if (this.keypair.pub.length !== 32 || this.keypair.priv.length !== 64) {
            throw new Error("Invalid keypair loaded from environment.");
        }

        // Set transaction type and data
        this.type = type;
        this.data = data;

        // Return unsigned transaction
        return this.sign();
    }

    private sign(): any {
        let msg: Buffer; // Buffered/encoded transaction data
        let sig: Buffer; // Raw signature buffer

        try {
            // Buffer message and generate signature
            msg = Buffer.from(JSON.stringify(this.data), "utf8");
            sig = ed25519.Sign(msg, this.keypair.priv);
        } catch (err) {
            // console.log(err) // debug
            throw new Error("Failed to generate signature.");
        }

        // Generate proof object
        this.proof = {
            from: this.keypair.pub.toString("base64"),
            signature: sig.toString("base64"),
        };

        // Return transaction object
        return { type: this.type, data: this.data, proof: this.proof };
    }
}
