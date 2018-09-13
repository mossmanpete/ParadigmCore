"use strict";
/*
  =========================
  Blind Star - codename (developent)
  handlers.ts @ {master}
  =========================
  @date_inital 12 September 2018
  @date_modified 12 September 2018
  @author Henry Harder

  General functions and utilities, as well as ABCI handlers.
*/
Object.defineProperty(exports, "__esModule", { value: true });
function decode(txByteArray) {
    let chars = [];
    txByteArray.forEach(element => {
        chars.push(String.fromCharCode(element));
    });
    return chars.join('');
}
exports.decode = decode;
