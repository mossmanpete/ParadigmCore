/*
  =========================
  Blind Star - codename (developent)
  PayloadEncoder.ts @ {server}
  =========================
  @date_inital 21 September 2018
  @date_modified 24 September 2018
  @author Henry Harder

  Compression and encoding.
*/

import * as zlib from "zlib";
import { IN_ENC, OUT_ENC } from "./config";

export class PayloadEncoder {
    private inEncoding: string; // encoding for in/output of orders, default utf8
    private outEncoding: string;  // encoding used for URL transport, default base64

    constructor(options: any) {
        /*
         Supply `new PayloadEncoder(...)` with options object: 
         let options = {
             inputEncoding: "..." // encoding type
             outputEncoding: "..." // encoding type
         }
        */

        if(options != null){
            this.inEncoding = options.inputEncoding;
            this.outEncoding = options.outputEncoding
        } else {
            this.inEncoding = IN_ENC;
            this.outEncoding = OUT_ENC
        }
    }

    public encodeFromObject(payload: object): string {
        let rawStr: string; // raw input string
        let inBuff: Buffer; // raw input buffer
        let cpBuff: Buffer; // compressed buffer
        let outStr: string; // encoded output string

        try {
            rawStr = JSON.stringify(payload);
            inBuff = Buffer.from(rawStr, this.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(this.outEncoding)
        } catch (err) {
            console.log(err) // debugging (REMOVE)
            throw new Error("Error encoding payload.")
        }
        return outStr;
    }

    public encodeFromString(payload: string): string {
        let rawStr: string = payload; // raw input string
        let inBuff: Buffer; // raw input buffer
        let cpBuff: Buffer; // compressed buffer
        let outStr: string; // encoded output string

        try {
            inBuff = Buffer.from(rawStr, this.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(this.outEncoding)
        } catch (err) {
            console.log(err) // debugging (REMOVE)
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }

    public decodeToString(input: string): string {
        let inBuff: Buffer; // input buffer
        let dcBuff: Buffer; // decompressed buffer
        let outStr: string; // decoded string

        try {
            inBuff = Buffer.from(input, this.outEncoding);
            dcBuff = zlib.inflateSync(inBuff);
            outStr = dcBuff.toString(this.inEncoding);
        } catch (err) {
            console.log(err) // debugging (REMOVE)
            throw new Error("Error decoding payload.");
        }
        return outStr;
    }

    public decodeToObject(input: string): object {
        let inBuff: Buffer; // input buffer
        let dcBuff: Buffer; // decompressed buffer
        let outStr: string; // decoded string
        let outObj: object; // output object

        try {
            inBuff = Buffer.from(input, this.outEncoding);
            dcBuff = zlib.inflateSync(inBuff);
            outStr = dcBuff.toString(this.inEncoding);
        } catch (err) {
            console.log(err) // debugging (REMOVE)
            throw new Error("Error decoding payload.");
        }
        
        try {
            outObj = JSON.parse(outStr);
        } catch (err) {
            console.log(err);
            throw new Error("Error creating object from JSON");
        }

        return outObj;
    }
}