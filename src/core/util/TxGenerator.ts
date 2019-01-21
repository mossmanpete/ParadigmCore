/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name TxGenerator.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  08-November-2018
 * @date (modified) 21-December-2018
 *
 * A class that allows for the generation of signed ABCI transaction, and
 * provides methods for verifying transaction signatures.
 *
 * @todo refactor/separate out validation
 */

// Ed25519 signature implementation and crypto
import { createHash as hash } from "crypto";
import { Sign, Verify } from "ed25519";

// ParadigmCore utilities
import { bigIntReplacer } from "../../util/static/bigIntUtils";

/**
 * Generates and signs ABCI transactions from validators.
 */
export class TxGenerator {

    /**
     * Returns true if an ABCI transaction is structurally valid (stateless
     * validity).
     *
     * @param rawTx  {object}    raw transaction object
     */
    public static isValidInput(rawTx: RawTransaction): boolean {
        // All Tx types should have the same outer level structure
        if (
            typeof(rawTx) !== "object" ||
            Object.keys(rawTx).length !== 2 ||
            typeof(rawTx.type) !== "string" ||
            typeof(rawTx.data) !== "object"
        ) {
            return false;
        }

        // Validation rules vary based on tx type
        switch (rawTx.type) {
            // OrderBroadcast type
            case "order": {
                const txData = rawTx.data as OrderData;
                if (
                    typeof(txData.posterSignature) !== "object" ||
                    typeof(txData.subContract) !== "string"
                ) {
                    return false;
                } else {
                    return true;
                }
            }

            // StreamBroadcast type
            // @TODO: complete stream spec and implement validation rules
            case "stream": { return true; }

            // Ethereum event attestation
            case "witness": {
                const txData = rawTx.data as WitnessData;
                if (
                    Object.keys(txData).length !== 7 ||
                    typeof(txData.block) !== "number" ||
                    typeof(txData.address) !== "string"
                ) {
                    console.log("\n\n (txgenerator): bad witness event data\n");
                    return false;
                } else {
                    return true;
                }
            }

            // Rate limit update Tx
            case "rebalance": {
                const txData = rawTx.data as RebalanceData;
                if (
                    Object.keys(txData).length !== 2 ||
                    typeof(txData.limits) !== "object" ||
                    typeof(txData.round) !== "object" ||
                    Object.keys(txData.round).length !== 4 ||
                    typeof(txData.round.endsAt) !== "number" ||
                    typeof(txData.round.startsAt) !== "number" ||
                    typeof(txData.round.number) !== "number" ||
                    typeof(txData.round.limit) !== "number"
                ) {
                    return false;
                } else {
                    return true;
                }
            }

            // All other types (or undefined, etc)
            default: {
                return false;
            }
        }
    }

    // Tendermint key "pair"
    private pubKey: Buffer;     // base64 encoded ed25519 public key
    private privKey: Buffer;    // base64 encoded ed25519 private key
    private address: Buffer;    // SHA256 (hexadecimal) digest of public key

    // Configuration options
    private encoding: string;

    /**
     * Create a new TransactionGenerator instance.
     *
     * @param options   {object}    options object with properties:
     *  - options.privateKey    {string}    base64 encoded ed25519 private key
     *  - options.publicKey     {string}    base64 encoded ed25519 public key
     */
    constructor(options) {
        // Set signature encoding
        switch (options.encoding) {
            case "base64": { this.encoding = "base64"; break; }
            case "hex": { this.encoding = "hex"; break; }

            // TODO: consider changing to default case
            case undefined: { this.encoding = "hex"; break; }
            default: {
                throw new Error("Invalid encoding.");
            }
        }

        // Load keys from base64 encoded strings
        try {
            this.pubKey = Buffer.from(options.publicKey, "base64");
            this.privKey = Buffer.from(options.privateKey, "base64");
        } catch (error) {
            throw new Error("invalid raw keypair.");
        }

        // Perform some light verification
        if (this.pubKey.length !== 32 || this.privKey.length !== 64) {
            throw new Error("supplied keypair of invalid length.");
        }

        let tempAddr: string;   // Computed address string

        // Generate address from public key
        try {
            // Hash public key, digest to hex, and keep first 40 bytes.
            // See encoding spec: (tendermint)/docs/spec/blockchain/encoding.md
            tempAddr = hash("sha256").update(this.pubKey).digest("hex");
            tempAddr = tempAddr.slice(0, 40);

            // Get raw buffer and store as address
            this.address = Buffer.from(tempAddr, "hex");
        } catch (error) {
            throw new Error("unable to generate address from public key.");
        }
    }

    /**
     * Create and sign an ABCI transaction. Returns a signed transaction object.
     *
     * @param rawTx {RawTransaction} raw and unsigned transaction object
     */
    public create(rawTx: RawTransaction): SignedTransaction {
        if (!TxGenerator.isValidInput(rawTx)) {
            throw new Error("invalid transaction data.");
        }

        let message: Buffer;    // buffered/encoded raw message
        let signature: Buffer;  // computed message signature

        try {
            // Buffer message (using custom stringifier)
            message = Buffer.from(
                JSON.stringify(rawTx.data, bigIntReplacer), "utf8"
            );

            // Generate signature
            signature = Sign(message, this.privKey);
        } catch (error) {
            throw new Error("failed to generate signature.");
        }

        // Append proof object to raw transaction and return
        return {
            ...rawTx,
            proof: {
                from: this.pubKey.toString(this.encoding),
                fromAddr: this.address.toString(this.encoding),
                signature: signature.toString(this.encoding),
            },
        };
    }

    /**
     * Returns true if a Tx's signature object is valid (i.e. message matches
     * signature, and "from" address matches recovered signature.).
     *
     * @param tx    {SignedTransaction} (unencoded) transaction object.
     */
    public verify(tx: SignedTransaction): boolean {
        let isValid: boolean; // Result of verification

        try {
            // Buffer and encode message, signature, and public key
            const msg = Buffer.from(JSON.stringify(tx.data), "utf8");
            const sig = Buffer.from(tx.proof.signature, this.encoding);
            const pub = Buffer.from(tx.proof.from, this.encoding);

            // Verify signature
            isValid = Verify(msg, sig, pub);

            // Check that "fromAddr" matches public key hash
            const a = hash("sha256").update(pub).digest("hex").slice(0, 40);
            if (Buffer.from(a, "hex").toString(this.encoding) !== tx.proof.fromAddr) {
                isValid = false;
            }
        } catch (err) {
            return false;
        }

        // Confirm Verify() function returns boolean
        if (typeof(isValid) !== "boolean") { return false; }

        // Otherwise, return result
        return isValid;
    }
}
