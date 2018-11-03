"use strict";
/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name PayloadCipher.ts
 * @module crypto
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  21-September-2018
 * @date (modified) 02-November-2018
 *
 * Compression and encoding (and decompression and decoding) for local ABCI
 * transactions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zlib = require("zlib");
const { IN_ENC, OUT_ENC } = process.env;
class PayloadCipher {
    /**
     * encodeFromObject (public static method): Construct encoded and compressed
     * output string from raw input object.
     *
     * @param input {string} encoded input string
     */
    static encodeFromObject(payload) {
        let rawStr; // raw input string
        let inBuff; // raw input buffer
        let cpBuff; // compressed buffer
        let outStr; // encoded output string
        try {
            rawStr = JSON.stringify(payload);
            inBuff = Buffer.from(rawStr, PayloadCipher.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(PayloadCipher.outEncoding);
        }
        catch (err) {
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }
    /**
     * encodeFromString (public static method): Construct encoded and compressed
     * output string from raw input string.
     *
     * @param payload {string} raw input string (uncompressed)
     */
    static encodeFromString(payload) {
        const rawStr = payload; // raw input string
        let inBuff; // raw input buffer
        let cpBuff; // compressed buffer
        let outStr; // encoded output string
        try {
            inBuff = Buffer.from(rawStr, PayloadCipher.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(PayloadCipher.outEncoding);
        }
        catch (err) {
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }
    /**
     * decodeToString (public static method): Construct decoded and decompressed
     * output string from encoded and compressed input.
     *
     * @param input {string} encoded input string
     */
    static decodeToString(input) {
        let inBuff; // input buffer
        let dcBuff; // decompressed buffer
        let outStr; // decoded string
        try {
            inBuff = Buffer.from(input, PayloadCipher.outEncoding);
            dcBuff = zlib.inflateSync(inBuff);
            outStr = dcBuff.toString(PayloadCipher.inEncoding);
        }
        catch (err) {
            throw new Error("Error decoding payload.");
        }
        return outStr;
    }
    /**
     * decodeToObject (public static method): Construct transaction object
     * from encoded and compressed string.
     *
     * @param input {string} encoded input string
     */
    static decodeToObject(input) {
        let inBuff; // input buffer
        let dcBuff; // decompressed buffer
        let outStr; // decoded string
        let outObj; // output object
        try {
            inBuff = Buffer.from(input, PayloadCipher.outEncoding);
            dcBuff = zlib.inflateSync(inBuff);
            outStr = dcBuff.toString(PayloadCipher.inEncoding);
        }
        catch (err) {
            throw new Error("Error decoding payload.");
        }
        try {
            outObj = JSON.parse(outStr);
        }
        catch (err) {
            throw new Error("Error creating object from JSON");
        }
        return outObj;
    }
    /**
     * ABCIdecode (public static method): Use to decode an incoming Buffer as
     * delivered via Tendermint core.
     *
     * @param inBuff {Buffer}
     */
    static ABCIdecode(inBuff) {
        // TODO: consider depreciating and wrapping into other function
        const inStr = inBuff.toString(PayloadCipher.inEncoding);
        return PayloadCipher.decodeToObject(inStr);
    }
}
// encoding for in/output of orders, default utf8
PayloadCipher.inEncoding = IN_ENC;
// encoding used for URL transport, default base64
PayloadCipher.outEncoding = OUT_ENC;
exports.PayloadCipher = PayloadCipher;
