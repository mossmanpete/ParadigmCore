"use strict";
/**
  =========================
  ParadigmCore: Blind Star
  Transaction.ts @ {master}
  =========================

  @date_initial 1 November 2018
  @date_modified 1 November 2018
  @author Henry Harder

  A class representing an ABCI transaction from a validator. Implements
  ed25519 signatures from Tendermint validator keypairs.

  @TODO convert to TransactionGenerator that loads private keys only once
  upon initialization.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const ed25519 = require("ed25519");
class Transaction {
    static verify(tx) {
        let msg; // Raw message buffer
        let sig; // Signature buffer
        let pub; // Public key buffer
        let isValid; // Result of verification
        try {
            // Buffer and encode message, signature, and public key
            msg = Buffer.from(JSON.stringify(tx.data), 'utf8');
            sig = Buffer.from(tx.proof.signature, 'base64');
            pub = Buffer.from(tx.proof.from, 'base64');
            // Verify signature
            isValid = ed25519.Verify(msg, sig, pub);
        }
        catch (err) {
            return false;
        }
        // Confirm Verify() function return boolean
        if (typeof (isValid) !== 'boolean')
            return false;
        // Otherwise, return result
        return isValid;
    }
    constructor(type, data) {
        // Validate Tx type
        switch (type) {
            case 'order': {
                break;
            }
            case 'stream': {
                break;
            }
            case 'witness': {
                break;
            }
            case 'rebalance': {
                break;
            }
            default: {
                throw new Error("Invalid transaction type.");
            }
        }
        // Destructure keys from environment
        let { PRIV_KEY, PUB_KEY } = process.env;
        // Buffer and encode keys
        this.keypair = {
            pub: Buffer.from(PUB_KEY, 'base64'),
            priv: Buffer.from(PRIV_KEY, 'base64')
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
    sign() {
        let msg; // Buffered/encoded transaction data
        let sig; // Raw signature buffer
        try {
            // Buffer message and generate signature
            msg = Buffer.from(JSON.stringify(this.data), 'utf8');
            sig = ed25519.Sign(msg, this.keypair.priv);
        }
        catch (err) {
            // console.log(err) // debug
            throw new Error("Failed to generate signature.");
        }
        // Generate proof object
        this.proof = {
            from: this.keypair.pub.toString('base64'),
            signature: sig.toString('base64')
        };
        // Return transaction object
        return { type: this.type, data: this.data, proof: this.proof };
    }
}
exports.Transaction = Transaction;
