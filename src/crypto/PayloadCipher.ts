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

import * as zlib from "zlib";
import { IN_ENC, OUT_ENC } from "../config";

export class PayloadCipher {
    private static inEncoding: string = IN_ENC; // encoding for in/output of orders, default utf8
    private static outEncoding: string = OUT_ENC;  // encoding used for URL transport, default base64

    public static encodeFromObject(payload: object): string {
        let rawStr: string; // raw input string
        let inBuff: Buffer; // raw input buffer
        let cpBuff: Buffer; // compressed buffer
        let outStr: string; // encoded output string

        try {
            rawStr = JSON.stringify(payload);
            inBuff = Buffer.from(rawStr, PayloadCipher.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(PayloadCipher.outEncoding)
        } catch (err) {
            // console.log(err) // debugging (REMOVE)
            throw new Error("Error encoding payload.")
        }
        return outStr;
    }

    public static encodeFromString(payload: string): string {
        let rawStr: string = payload; // raw input string
        let inBuff: Buffer; // raw input buffer
        let cpBuff: Buffer; // compressed buffer
        let outStr: string; // encoded output string

        try {
            inBuff = Buffer.from(rawStr, PayloadCipher.inEncoding);
            cpBuff = zlib.deflateSync(inBuff);
            outStr = cpBuff.toString(PayloadCipher.outEncoding)
        } catch (err) {
            // console.log(err) // debugging (REMOVE)
            throw new Error("Error encoding payload.");
        }
        return outStr;
    }

    public static decodeToString(input: string): string {
        let inBuff: Buffer; // input buffer
        let dcBuff: Buffer; // decompressed buffer
        let outStr: string; // decoded string

        try {
            inBuff = Buffer.from(input, PayloadCipher.outEncoding);
            dcBuff = zlib.inflateSync(inBuff);
            outStr = dcBuff.toString(PayloadCipher.inEncoding);
        } catch (err) {
            // console.log(err) // debugging (REMOVE)
            throw new Error("Error decoding payload.");
        }
        return outStr;
    }

    public static decodeToObject(input: string): object {
        let inBuff: Buffer; // input buffer
        let dcBuff: Buffer; // decompressed buffer
        let outStr: string; // decoded string
        let outObj: object; // output object

        try {
            inBuff = Buffer.from(input, PayloadCipher.outEncoding);
            dcBuff = zlib.inflateSync(inBuff);
            outStr = dcBuff.toString(PayloadCipher.inEncoding);
        } catch (err) {
            // console.log(err) // debugging (REMOVE)
            throw new Error("Error decoding payload.");
        }
        
        try {
            outObj = JSON.parse(outStr);
        } catch (err) {
            // console.log(err);
            throw new Error("Error creating object from JSON");
        }

        return outObj;
    }

    public static ABCIdecode(inBuff: Buffer): object {
        /*
            ABCIdecode is used in the ABCI application to decode the
            input buffer 
        */
       let inStr: string = inBuff.toString(this.outEncoding);
       
       return PayloadCipher.decodeToObject(inStr);
    }
}