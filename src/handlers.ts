
/*
  =========================
  Blind Star - codename (developent)
  handlers.ts @ {master}
  =========================
  @date_inital 12 September 2018
  @date_modified 24 September 2018
  @author Henry Harder

  General functions and utilities, as well as ABCI handlers.
*/

let _pjs = require("paradigm.js");
let _enc = require("./PayloadCipher").PayloadCipher
let log = require("./Logger").Logger

let version = require('./config').VERSION;
let Vote = require('./Vote').Vote;


let paradigm = new _pjs(); // new paradigm instance
let Order = paradigm.Order; 

let cipher = new _enc({ // new Payload
  inputEncoding: 'utf8',
  outputEncoding: 'base64'
});

let state = { // eventually will represent address => limit
  number: 0
}

export let handlers = {
  info: (_) => {
    return {
      data: 'Stake Verification App',
      version: version,
      lastBlockHeight: 0,
      lastBlockAppHash: Buffer.alloc(0)
    }
  },

  checkTx: (request) => {
    let txObject;
    
    try {
      txObject = cipher.ABCIdecode(request.tx);
    } catch (error) {
      log.logEvent("Bad order post, error decompressing TX - rejected");
      return Vote.invalid("Bad order, error decompressing TX");
    }

    try {      
      let newOrder = new Order(txObject);
      let recoveredAddr = newOrder.recoverPoster();
      if (typeof(recoveredAddr) === "string"){ 
        /*
          The above conditional shoud rely on a verifyStake(), that checks
          the existing state for that address. 
        */        
        return Vote.valid(`Stake verified, order kept.`);
      } else {
        log.logEvent("Bad order post, no stake - rejected")
        return Vote.invalid('Bad order maker - no stake.');
      }
    } catch (error) {
      log.logEvent("Bad order post, bad format - rejected");
      return Vote.invalid('Bad order format.');
    }
  },

  deliverTx: (request) => {
    let txObject;
    
    try {
      txObject = cipher.ABCIdecode(request.tx);
    } catch (error) {
      log.logEvent("Bad order, error decompressing - rejected")
      return Vote.invalid('Bad order - error decompressing TX.');
    }

    try {      
      let newOrder = new Order(txObject);
      let recoveredAddr = newOrder.recoverPoster();
      if (typeof(recoveredAddr) === "string"){ 
        /*
          The above conditional shoud rely on a verifyStake(), that checks
          the existing state for that address. 
       */
        log.logEvent("Valid order received (in deliverTx)")
        return Vote.valid(`Success: stake of '${recoveredAddr}' verified.`);
      } else {
        log.logEvent("Bad order post, no stake - rejected")
        return Vote.invalid('Bad order maker - no stake.');
      }
    } catch (error) {
      log.logEvent("Bad order post, bad format - rejected");
      return Vote.invalid('Bad order format.');
    }
  }
}

