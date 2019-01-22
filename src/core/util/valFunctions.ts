/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name main.ts
 * @module src/util/static
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  03-December-2018
 * @date (modified) 22-January-2019
 *
 * Utility and conversion functions for validator-related activities.
 */

// Standard library imports
import { createHash } from "crypto";
import { ValidatorUpdate } from "src/typings/abci";

/**
 * Convert a Tendermint ed25519 public key to nodeID/address.
 *
 * @param input {Buffer<32>}   public key bytes
 */
export function pubToAddr(input: Buffer): Buffer {
    // Validate input
    if (!(input instanceof Buffer)) { throw Error("bad input type"); }
    if (input.length !== 32) { throw Error("expected input to be 32 bytes"); }

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
    if (!(input instanceof Buffer)) { throw Error("bad input type"); }
    if (input.length !== 64) { throw Error("expected input to be 64 bytes"); }

    // Compute and return public key
    return input.slice(32, 64);
}

/**
 * Generates a `ValidatorUpdate` object, intended to be used in the EndBlock 
 * handler.
 * 
 * @param pubKey {Buffer} raw 32 byte public key
 * @param power {bigint} desired power for validator
 */
export function validatorUpdate(pubKey: Buffer, power: bigint): ValidatorUpdate {
    return {
        pubKey : {
            type: "ed25519",
            data: pubKey
        },
        power: parseInt(power.toString(), 10),
    };
}

/**
 * Simple wrapper for Object.keys() to execute a function on each validator that
 * is currently in-state.
 * 
 * @param state {State} current state object
 * @param cb {function} callback function to execute on each validator
 */
export function doForEachValidator(state: State, cb: (v, i, a) => void): void {
    Object.keys(state.validators).forEach(cb);
}
