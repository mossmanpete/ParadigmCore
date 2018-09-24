/*
  =========================
  Blind Star - codename (developent)
  handlers.ts @ {server}
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

export function bufferToString(byteArr): string{
  let outarr = [];
  for(let i=0; i<byteArr.length; i++){
      outarr.push(String.fromCharCode(parseInt(byteArr[i])));
  }
  return outarr.join('')
}

export function addPlus(string: string): string{
  // add "+" characters back to URLs... this is pretty hacky
  let out = [];
  for(let i=0; i<string.length; i++){
    if(string.charAt(i) === " "){
      out.push("+");
    } else {
      out.push(string.charAt(i));
    }
  }
  return out.join('');
}

