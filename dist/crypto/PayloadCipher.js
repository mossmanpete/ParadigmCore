"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zlib = require("zlib");
const { IN_ENC, OUT_ENC } = process.env;
class PayloadCipher {
    static txEncodeFromObject(payload) {
        let rawStr;
        let inBuff;
        let cpBuff;
        let outStr;
        try {
            rawStr = JSON.stringify(payload, (_, v) => {
                if (typeof (v) === "bigint") {
                    return `${v.toString()}n`;
                }
                else {
                    return v;
                }
            });
            inBuff = Buffer.from(rawStr, PayloadCipher.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(PayloadCipher.outEncoding);
        }
        catch (error) {
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }
    static encodeFromObject(payload) {
        let rawStr;
        let inBuff;
        let cpBuff;
        let outStr;
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
    static encodeFromString(payload) {
        const rawStr = payload;
        let inBuff;
        let cpBuff;
        let outStr;
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
    static decodeToString(input) {
        let inBuff;
        let dcBuff;
        let outStr;
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
    static decodeToObject(input) {
        let inBuff;
        let dcBuff;
        let outStr;
        let outObj;
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
    static ABCIdecode(inBuff) {
        const inStr = inBuff.toString(PayloadCipher.inEncoding);
        return PayloadCipher.decodeToObject(inStr);
    }
}
PayloadCipher.inEncoding = IN_ENC;
PayloadCipher.outEncoding = OUT_ENC;
exports.PayloadCipher = PayloadCipher;
