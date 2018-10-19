/* 
  =========================
  ParadigmCore: Blind Star
  handlers.ts @ {rebalance-refactor}
  =========================

  @date_inital 16 September 2018
  @date_modified 17 October 2018
  @author Henry Harder

  ABCI handler functions and state-transition logic. 
*/

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
    PERIOD_LIMIT, STAKE_CONTRACT_ADDR, STAKE_CONTRACT_ABI, ABCI_HOST, ABCI_RPC_PORT 
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
export async function start(_emitter: EventEmitter, _state: object, _client: any){
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
            stakeContractABI: STAKE_CONTRACT_ABI,
            tendermintRpcHost: ABCI_HOST,
            tendermintRpcPort: ABCI_RPC_PORT
        });

        //abci(handlers).listen(ABCI_PORT, () => {
        //    Logger.consensus(msg.abci.messages.servStart);
        //});

        await abci(handlers).listen(ABCI_PORT);
        Logger.consensus(msg.abci.messages.servStart);

    } catch (err) {
      throw new Error('Error initializing ABCI application.');
    }
    return
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

    if(txObject.type === "OrderBroadcast"){ // tx type is OrderBroadcast

      try {      
        let newOrder = new Order(txObject.data);
        let recoveredAddr = newOrder.recoverPoster();
        if (state.mapping[recoveredAddr].orderBroadcastLimit > 0){
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

    } else if(txObject.type === 'Rebalance'){ // tx type is Rebalance
      
      Logger.mempool("we got a rebalance event");

      if((state.round.number === 0) && (txObject.data.round.number === 1)){
        // should only be triggered by the first rebalance TX
        Logger.mempool('first state update pass mempool');
        return Vote.valid(); // vote to accept state
      } else if (state.round.number === txObject.data.round.number - 1){
        Logger.mempool('subsequent state update pass mempool');
        return Vote.valid();
      }

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

        if (state.mapping[recoveredAddr].orderBroadcastLimit > 0){ 
          /*
            BEGIN STATE MODIFICATION
          */

          let dupOrder: any = newOrder.toJSON(); // create copy of order
          dupOrder.id = Hasher.hashOrder(newOrder); // append OrderID

          state.mapping[recoveredAddr].orderBroadcastLimit -= 1; // decrease quota by 1
          state.counter += 1; // add 1 to total number of orders

          tracker.add(dupOrder); // add order to queue for broadcast

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

      Logger.consensus("we got a rebalance event");
      if((state.round.number === 0) && (txObject.data.round.number === 1)){
        // should only be triggered by the first rebalance TX

        state.round.number = 1;
        state.round.startsAt = txObject.data.round.startsAt;
        state.round.endsAt = txObject.data.round.endsAt;

        state.mapping = txObject.data.mapping;

        Logger.consensus("Accepted parameters for first staking round.");
        return Vote.valid(); // vote to accept state

      } else if (state.round.number > 0) {
        if (txObject.data.round.number === (state.round.number + 1)) {
          let roundInfo = rebalancer.getConstructedMapping();
          let validFor = roundInfo.validFor;
          let localMapping = roundInfo.mapping;

          if (JSON.stringify(localMapping) === JSON.stringify(txObject.data.mapping)){

            state.round.number = txObject.data.round.number;
            state.round.startsAt = txObject.data.round.startsAt;
            state.round.endsAt = txObject.data.round.endsAt;

            state.mapping = txObject.data.mapping;

            Logger.consensus(`New state accepted (for round #${state.round.number})`);
            return Vote.valid();
          } else {
            Logger.consensusErr(`W: Rejected. New state does not match local mapping.`);
            return Vote.invalid();
          }
          
        } else {
          Logger.consensusErr(`W: Rejected. New state for wrong round.`);
          return Vote.invalid();
        }
      }

      Logger.consensusErr("E. You probably shouldn't see this.");
      return Vote.invalid("not implemented");
    } else {
      // tx type does not match Rebalance or OrderBroadcast

      Logger.consensusErr("Unknown transaction type.");
      return Vote.invalid("not implemented");
    }
}

function commit(request){
    try {
      if((state.round.startsAt > 0) && (rebalancer.getPeriodNumber() + 1 === state.round.number)){
      
        let newRound = state.round.number; // correct???
        let newStart = state.round.startsAt;
        let newEnd = state.round.endsAt;
        
        rebalancer.synchronize(newRound, newStart, newEnd);

        console.log('done calling sync. here is the state:')
        console.log(JSON.stringify(state));

      } /*else {
        console.log('@267 what should be here?');
      }*/
      
      tracker.triggerBroadcast();
    } catch (err) {
      // console.log(err);
      Logger.logError("Error broadcasting TX in commit.")
    }
    
    return "done" // change to something more meaningful
}