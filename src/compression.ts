/*
  =========================
  Blind Star - codename (developent)
  compression.ts @ {master}
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
    }

    private decompress() {
        try {
            let decBuffer: Buffer = zlib.inflateSync(this.rawBytes);
        } catch (error) {
            return Buffer.from("0");
        }
    }
}