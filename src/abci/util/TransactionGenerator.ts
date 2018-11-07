// tslint:disable

import { createHash as hash } from "crypto";
import { Sign, Verify } from "ed25519";

export class TransactionGenerator {
    private pubKey: Buffer;     // base64 encoded ed25519 public key
    private privKey: Buffer;    // base64 encoded ed25519 private key
    private address: Buffer;    // SHA256 (hexidecimal) digest of public key

    constructor(options) {
        // Load keys from base64 encoded strings
        try {
            this.pubKey = Buffer.from(options.publicKey, "base64");
            this.privKey = Buffer.from(options.privateKey, "base64");
        } catch (error) {
            throw new Error("Invalid raw keypair.");
        }

        // Perform some light verification
        if (this.pubKey.length !== 32 || this.privKey.length !== 64) {
            throw new Error("Supplied keypair of invalid length.");
        }

        let tempAddr: string;   // Temporarily store computed address string

        // Generate address from public key
        try {
            // Hash public key, digest to hex, and keep first 40 bytes.
            // See encoding spec: (tendermint)/docs/spec/blockchain/encoding.md
            tempAddr = hash("sha256").update(this.pubKey).digest("hex");
            tempAddr = tempAddr.slice(0, 40);

            // Get raw buffer and store as addres
            this.address = Buffer.from(tempAddr, "hex");
        } catch (error) {
            throw new Error("Unable to generate address from public key.");
        }
    }
}
