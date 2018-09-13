/*
  =========================
  Blind Star - codename (developent)
  index.ts @ {master}
  =========================
  @date_inital 12 September 2018
  @date_modified 12 September 2018
  @author Henry Harder

  Main ABCI application supporting the OrderStream network. 
*/

let createABCIServer = require('abci');
let port = require('./config').PORT

let state = {
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
    
    console.log("Request: " + request);
    console.log("Request.tx: " + request.tx);
    return { code: 0, log: 'tx succeeded' } // valid
  },

  deliverTx (request) {
  
    state.number += 1
    console.log("Success, tx number: "+state.number )
    return { code: 0, log: 'tx succeeded' } // valid
  }
}

createABCIServer(handlers).listen(port, () => {
  console.log(`Listening on port ${port}`)
})
