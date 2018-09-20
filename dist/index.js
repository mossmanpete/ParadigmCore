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
let zlib = require('zlib');

let createABCIServer = require('abci');
let port = require('./config').PORT;
let decode = require("./handlers").decode
let addPlus = require('./handlers').addPlus

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
    
    //txObject = zlib.inflateSync(Buffer.from(addPlus(decode(request.tx)), 'base64'));
    //console.log(txObject);

    try {      
      let newOrder = new Order(JSON.parse(decode(request.tx)));
      let recoveredAddr = newOrder.recoverMaker(); // eventually will be *.recoverPoster()

      if (typeof(recoveredAddr) === "string"){ // change to recoverPoster eventually
        /*
          The above conditional shoud rely on a verifyStake(), that checks
          the existing state for that address. 
        */
        return { 
          code: 0, 
          log: 'Success - stake of '+ recoveredAddr +' verified.' 
        }

      } else {
        return { 
          code: 1, 
          log: 'Bad order maker - no stake.' 
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

    try {      
      let newOrder = new Order(JSON.parse(decode(request.tx)));
      let recoveredAddr = newOrder.recoverMaker(); // eventually will be *.recoverPoster()

      if (typeof(recoveredAddr) === "string"){ // change to recoverPoster eventually
        /*
          The above conditional shoud rely on a verifyStake(), that checks
          the existing state for that address. 
        */

       state.number -= 1; // will eventually reduce limit by 1 
       return {
         code: 0, 
         log: 'Success - stake verified.'
       }

      } else {
        return {
          code: 1, 
          log: 'Bad order maker - no stake.' 
        } 
      }

    } catch (error) {
      console.log(error);
      return { 
        code: 1,
        log: 'Bad order format' 
      } 
    }
  }
}

createABCIServer(handlers).listen(port, () => {
  console.log(`Listening on port ${port}`);
});
