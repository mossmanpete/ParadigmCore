"use strict";
/*
  =========================
  Blind Star - codename (developent)
  PayloadEncoder.ts @ {server}
  =========================
  @date_inital 21 September 2018
  @date_modified 21 September 2018
  @author Henry Harder

  Compression and encoding.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const zlib = require("zlib");
const config_1 = require("./config");
class PayloadEncoder {
    constructor(options) {
        /*
         Supply `new PayloadEncoder(...)` with options object:
         let options = {
             inputEncoding: "..." // encoding type
             outputEncoding: "..." // encoding type
         }
        */
        if (options != null) {
            this.inEncoding = options.inputEncoding;
            this.outEncoding = options.outputEncoding;
        }
        else {
            this.inEncoding = config_1.IN_ENC;
            this.outEncoding = config_1.OUT_ENC;
        }
    }
    encodeFromObject(payload) {
        let rawStr; // raw input string
        let inBuff; // raw input buffer
        let cpBuff; // compressed buffer
        let outStr; // encoded output string
        try {
            rawStr = JSON.stringify(payload);
            inBuff = Buffer.from(rawStr, this.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(this.outEncoding);
        }
        catch (err) {
            console.log(err); // debugging (REMOVE)
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }
    encodeFromString(payload) {
        let rawStr = payload; // raw input string
        let inBuff; // raw input buffer
        let cpBuff; // compressed buffer
        let outStr; // encoded output string
        try {
            inBuff = Buffer.from(rawStr, this.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(this.outEncoding);
        }
        catch (err) {
            console.log(err); // debugging (REMOVE)
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }
    decodeToString(input) {
        let inBuff; // input buffer
        let dcBuff; // decompressed buffer
        let outStr; // decoded string
        try {
            inBuff = Buffer.from(input, this.outEncoding);
            dcBuff = zlib.inflateSync(inBuff);
            outStr = dcBuff.toString(this.inEncoding);
        }
        catch (err) {
            console.log(err); // debugging (REMOVE)
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }
}
exports.PayloadEncoder = PayloadEncoder;
