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

export function decode(txByteArray: Array<number>) {
    let chars: Array<string> = []
    txByteArray.forEach(element => {
      chars.push(String.fromCharCode(element))
    });
    return chars.join('')
  }