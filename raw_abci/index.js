let createABCIServer = require('abci');

function decode(txByteArray) {
  let chars = []
  txByteArray.forEach(element => {
    chars.push(String.fromCharCode(element))
  });
  return chars.join('')
}

let state = {
  // how to format for construction/testing?
  number: 0
}

let handlers = {
  info (_) {
    return {
      data: 'Stake Verification App',
      version: '0.0.0a1',
      lastBlockHeight: 0,
      lastBlockAppHash: Buffer.alloc(0)
    }
  },

  checkTx (request) {
    
    //if (/* invalid */) {
    //  return { code: 1, log: 'tx does not match count' }
    //}
    txString = decode(request.tx);
    txObject = JSON.parse(txString);
    console.log("in checktx: ");
    console.log(txString);
    return { code: 0, log: 'tx succeeded' } // valid
  },

  deliverTx (request) {
    
    //if (/* invalid */) {
    //  return { code: 1, log: 'tx does not match count' }
    //}

    // update state
    state.number += 1
    console.log("success, tx number: "+state.number )
    return { code: 0, log: 'tx succeeded' } // valid
  }
}

let port = 26658
createABCIServer(handlers).listen(port, () => {
  console.log(`listening on port ${port}`)
})
