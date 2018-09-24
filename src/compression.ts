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

import * as zlib from "zlib";

export class TransactionPayload {
    private raw: string; // raw (base64) string from URL
    private rawBytes: Buffer; // encoded buffer
    private decompressedBytes: Buffer;
    private decoded: string;

    constructor(input: string) {
        this.raw = input;
        this.rawBytes = Buffer.from(this.raw, 'base64');
        try {
            this.decompressedBytes = this.decompress()
        } catch (error) {
            throw new Error("Bad order encoding");
        }
        this.decoded = this.decompressedBytes.toString('utf8');
    }

    private decompress() {
        try {
            let decBuffer: Buffer = zlib.inflateSync(this.rawBytes);
            return decBuffer;
        } catch (error) {
            return Buffer.from("0");
        }
    }
}