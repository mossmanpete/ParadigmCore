export function decode(txByteArray: Array<number>) {
    let chars: Array<string> = []
    txByteArray.forEach(element => {
      chars.push(String.fromCharCode(element))
    });
    return chars.join('')
  }