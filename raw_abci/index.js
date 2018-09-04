let createABCIServer = require('abci');
let port = 26658

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
    
    txString = request.tx.toString();//decode(request.tx);
    //txObject = JSON.parse(txString);
    console.log("in checktx: ");
    console.log(txString);
    return { code: 0, log: 'tx succeeded' } // valid
  },

  deliverTx (request) {
  
    state.number += 1
    console.log("success, tx number: "+state.number )
    return { code: 0, log: 'tx succeeded' } // valid
  }
}

createABCIServer(handlers).listen(port, () => {
  console.log(`Listening on port ${port}`)
})
