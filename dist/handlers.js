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
function bufferToString(byteArr) {
    let outarr = [];
    for (let i = 0; i < byteArr.length; i++) {
        outarr.push(String.fromCharCode(parseInt(byteArr[i])));
    }
    return outarr.join('');
}
exports.bufferToString = bufferToString;
function addPlus(string) {
    // add "+" characters back to URLs... this is pretty hacky
    let out = [];
    for (let i = 0; i < string.length; i++) {
        if (string.charAt(i) === " ") {
            out.push("+");
        }
        else {
            out.push(string.charAt(i));
        }
    }
    return out.join('');
}
exports.addPlus = addPlus;
