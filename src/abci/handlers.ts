import * as Paradigm from "paradigm.js";
import * as abci from "abci";

import { Hasher } from "../crypto/Hasher";
import { PayloadCipher } from "../crypto/PayloadCipher";
import { Vote } from "../util/Vote"
import { Logger } from "../util/Logger";
import { OrderTracker } from "../async/OrderTracker";
import { EventEmitter } from "events";
import { StakeRebalancer } from "../async/StakeRebalancer";

import { messages as msg } from "../util/messages";

import { 
    VERSION, ABCI_PORT, WEB3_PROVIDER, PERIOD_LENGTH, 
    PERIOD_LIMIT, STAKE_CONTRACT_ADDR, STAKE_CONTRACT_ABI 
} from "../config";


let Order = new Paradigm().Order;

let tracker: OrderTracker; // used to broadcast orders
let rebalancer: StakeRebalancer; // construct and submit mapping
let state: any; // network rate-limit state
let handlers: object; // ABCI handler functions


/**
 * start (exported function): Initialize and start the ABCI application.
 * 
 * @param emitter {EventEmitter} global event emitter for tracking orders
 * @param port {number} port to use for the ABCI application
 */
export async function start(_emitter: EventEmitter, _state: object){
    try {
        state = _state;

        handlers = {
            info: info,
            beginBlock: beginBlock,
            checkTx: checkTx,
            deliverTx: deliverTx,
            commit: commit
        };

        tracker = new OrderTracker(_emitter);

        rebalancer = await StakeRebalancer.create({
            provider: WEB3_PROVIDER,
            periodLength: PERIOD_LENGTH,
            periodLimit: PERIOD_LIMIT,
            stakeContractAddr: STAKE_CONTRACT_ADDR,
            stakeContractABI: STAKE_CONTRACT_ABI
        });


        //abci(handlers).listen(ABCI_PORT, () => {
        //    Logger.consensus(msg.abci.messages.servStart);
        //});

        await abci(handlers).listen(ABCI_PORT);
        Logger.consensus(msg.abci.messages.servStart);

    } catch (err) {
        // TODO: change to exceptions
        return 1; // not okay
    }
    return 0; // okay
}

function info(_){
    return {
        data: 'Stake Verification App',
        version: VERSION,
        lastBlockHeight: 0,
        lastBlockAppHash: Buffer.alloc(0)
    }
}

function beginBlock(request){
    let currHeight = request.header.height;
    let currProposer = request.header.proposerAddress.toString('hex');

    rebalancer.newOrderStreamBlock(currHeight, currProposer);

    Logger.newRound(currHeight, currProposer);

    return {}
}

function checkTx(request){
    let txObject;

    try {
      txObject = PayloadCipher.ABCIdecode(request.tx);
    } catch (error) {
      Logger.mempoolErr(msg.abci.errors.decompress);
      return Vote.invalid(msg.abci.errors.decompress);
    }

    if(txObject.type === "OrderBroadcast"){
      // tx type is OrderBroadcast

      try {      
        let newOrder = new Order(txObject.data);
        let recoveredAddr = newOrder.recoverPoster();
        if (typeof(recoveredAddr) === "string"){
          /*
            The above conditional shoud rely on a verifyStake(), that checks
            the existing state for that address. 
          */
          Logger.mempool(msg.abci.messages.mempool);
          return Vote.valid(Hasher.hashOrder(newOrder));
        } else {
          Logger.mempool(msg.abci.messages.noStake)
          return Vote.invalid(msg.abci.messages.noStake);
        }
      } catch (error) {
        Logger.mempoolErr(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
      }

    } else if(txObject.type === 'Rebalance'){
      // tx type is Rebalance

      console.log("we got a rebalance event");
      return Vote.invalid("not implemented");

    } else {
      // tx type doesn't match OrderBroadcast or Rebalance

      Logger.mempoolErr("Unknown transaction type.");
      return Vote.invalid("Unknown transaction type.");
    }
}

function deliverTx(request){
    let txObject;
    
    try {
      txObject = PayloadCipher.ABCIdecode(request.tx);
    } catch (error) {
      Logger.consensusErr(msg.abci.errors.decompress)
      return Vote.invalid(msg.abci.errors.decompress);
    }


    if(txObject.type === "OrderBroadcast"){
      // tx type is OrderBroadcast
      
      try {      
        let newOrder = new Order(txObject.data);
        let recoveredAddr = newOrder.recoverPoster();

        if (typeof(recoveredAddr) === "string"){ 
          /*
            The above conditional shoud rely on a verifyStake(), that checks
            the existing state for that address. 

            BEGIN STATE MODIFICATION
          */

          let dupOrder: any = newOrder.toJSON();
          dupOrder.id = Hasher.hashOrder(newOrder);

          //emitter.emit("order", dupOrder); // broadcast order event
          tracker.add(dupOrder); // add order to queue for broadcast

          state.number += 1;

          /*
            END STATE MODIFICATION
          */

          Logger.consensus(msg.abci.messages.verified)
          return Vote.valid(dupOrder.id);
        } else {
          Logger.consensus(msg.abci.messages.noStake)
          return Vote.invalid(msg.abci.messages.noStake);
        }
      } catch (error) {
        // console.log(error);
        Logger.consensusErr(msg.abci.errors.format);
        return Vote.invalid(msg.abci.errors.format);
      }

    } else if(txObject.type === "Rebalance"){
      // tx type is Rebalance

      console.log("we got a rebalance event");
      return Vote.invalid("not implemented");
    } else {
      // tx type does not match Rebalance or OrderBroadcast

      Logger.consensusErr("Unknown transaction type.");
      return Vote.invalid("not implemented");
    }
}

function commit(request){
    try {
        tracker.triggerBroadcast();
    } catch (err) {
        // console.log(err)
        Logger.logError("Error broadcasting TX in commit.")
    }
    
    return "done" // change to something more meaningful
}