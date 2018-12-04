/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name main.ts
 * @module src/util/static
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  03-December-2018
 * @date (modified) 03-December-2018
 *
 * Utility and conversion functions for validator keys and addresses.
 */

// Standard library imports
import { createHash } from "crypto";

/**
 * Convert a Tendermint ed25519 public key to nodeID/address.
 *
 * @param input {Buffer<32>}   public key bytes
 */
export function pubToAddr(input: Buffer): Buffer {
    // Validate input
    if (!(input instanceof Buffer)) { throw Error("Bad input type."); }
    if (input.length !== 32) { throw Error("Expected input to be 32 bytes."); }

    // Compute and return address
    return Buffer.from(
        createHash("sha256").
        update(input).
        digest("hex").
        slice(0, 40).
        toLowerCase(), "hex"
    );
}

/**
 * Derive Tendermint public key from private key (ed25519 type).
 *
 * @param input {Buffer<64>}    private key bytes
 */
export function privToPub(input: Buffer): Buffer {
    // Validate input
    if (!(input instanceof Buffer)) { throw Error("Bad input type."); }
    if (input.length !== 64) { throw Error("Expected input to be 64 bytes."); }

    // Compute and return public key
    return input.slice(32, 64);
}
