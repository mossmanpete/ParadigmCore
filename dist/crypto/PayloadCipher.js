"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  PayloadCipher.ts @ {rebalance-refactor}
  =========================

  @date_inital 21 September 2018
  @date_modified 17 October 2018
  @author Henry Harder

  Compression and encoding.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const zlib = require("zlib");
const config_1 = require("../config");
class PayloadCipher {
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
            // console.log(err) // debugging (REMOVE)
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }
    static encodeFromString(payload) {
        let rawStr = payload; // raw input string
        let inBuff; // raw input buffer
        let cpBuff; // compressed buffer
        let outStr; // encoded output string
        try {
            inBuff = Buffer.from(rawStr, PayloadCipher.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(PayloadCipher.outEncoding);
        }
        catch (err) {
            // console.log(err) // debugging (REMOVE)
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }
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
            // console.log(err) // debugging (REMOVE)
            throw new Error("Error decoding payload.");
        }
        return outStr;
    }
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
            // console.log(err) // debugging (REMOVE)
            throw new Error("Error decoding payload.");
        }
        try {
            outObj = JSON.parse(outStr);
        }
        catch (err) {
            // console.log(err);
            throw new Error("Error creating object from JSON");
        }
        return outObj;
    }
    static ABCIdecode(inBuff) {
        /*
            ABCIdecode is used in the ABCI application to decode the
            input buffer
        */
        let inStr = inBuff.toString('utf8');
        let outArr = [];
        for (let i = 0; i < inStr.length; i++) {
            if (inStr.charAt(i) == " ") {
                outArr.push('+'); // "+" gets lost somewhere 
                // TODO: find where this happens
            }
            else {
                outArr.push(inStr.charAt(i));
            }
        }
        return PayloadCipher.decodeToObject(outArr.join(''));
    }
}
PayloadCipher.inEncoding = config_1.IN_ENC; // encoding for in/output of orders, default utf8
PayloadCipher.outEncoding = config_1.OUT_ENC; // encoding used for URL transport, default base64
exports.PayloadCipher = PayloadCipher;
