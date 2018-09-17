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

let paradigm = require("paradigm.js");

let createABCIServer = require('abci');
let port = require('./config').PORT;
let decode = require("./handlers").decode

let p = new paradigm();
let Order = p.Order;

let state = { // eventually will represent address => limit
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
    
    try {      
      let newOrder = new Order(JSON.parse(decode(request.tx)));
      let recoveredAddr = newOrder.recoverMaker(); // eventually will be *.recoverPoster()

      if (typeof(newOrder.recoverMaker()) === "string"){ // change to recoverPoster eventually
        return { 
          code: 0, 
          log: 'Success' 
        }

      } else {
        return { 
          code: 1, 
          log: 'Bad order maker' 
        } 
      }
    } catch (error) {
      console.log(error);
      return { 
        code: 1, 
        log: 'Bad order format' 
      } 
    }
  },

  deliverTx (request) {
    /* 
     This funciton will deliver a valid tx to the outputStream (the OrderStream)
     via websocket to all listenting parties. It will also check the validity of
     the stake a second time.
    */
  
    state.number += 1 // temporary 

    console.log("Success, tx number: "+state.number )
    return { 
      code: 0, 
      log: 'tx succeeded' 
    } 
  }
}

createABCIServer(handlers).listen(port, () => {
  console.log(`Listening on port ${port}`);
});
