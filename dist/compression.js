"use strict";
/*
  =========================
  Blind Star - codename (developent)
  compression.ts @ {server}
  =========================
  @date_inital 21 September 2018
  @date_modified 21 September 2018
  @author Henry Harder

  Compression and encoding.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const zlib = require("zlib");
class TransactionPayload {
    constructor(input) {
        this.raw = input;
        this.rawBytes = Buffer.from(this.raw, 'base64');
        try {
            this.decompressedBytes = this.decompress();
        }
        catch (error) {
            throw new Error("Bad order encoding");
        }
        this.decoded = this.decompressedBytes.toString('utf8');
    }
    decompress() {
        try {
            let decBuffer = zlib.inflateSync(this.rawBytes);
            return decBuffer;
        }
        catch (error) {
            return Buffer.from("0");
        }
    }
}
exports.TransactionPayload = TransactionPayload;
