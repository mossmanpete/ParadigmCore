/*
  =========================
  ParadigmCore: Blind Star
  StakeRebalancer.ts @ {dev}
  =========================

  @date_inital 15 October 2018
  @date_modified 23 October 2018
  @author Henry Harder

  UNSTABLE! UNSTABLE! UNSTABLE! UNSTABLE! (Okay not THAT unstable, but be careful)

  This class enables nodes to construct a rate-limit mapping of address:limit for each access
  control period on Ethereum (rebalance period). At the end of each listening period, it will
  trigger an ABCI transaction, which if deemed valid, updates the state of the network with 
  the new rate-limit mapping.

  This is one of the most important and complex pieces of the OrderStream system, and will 
  likely be unstable for a while. Assume that if this message is here, it should not be run 
  in production. 
*/

let Web3 = require('web3');
let { RpcClient } = require('tendermint');

import Contract from "web3/eth/contract";
import { Logger } from "../util/Logger";
import { PayloadCipher } from "../crypto/PayloadCipher";
import { messages as msg } from "../util/messages";

export class StakeRebalancer {
    private web3provider: string; // web3 provider URI
    private web3: any; // web3 instance

    private tmClient: any; // tendermint client for RPC
    private tmHost: string; // tendermint RPC host
    private tmPort: number; // tendermint RPC port

    private currentEthHeight: number; // current Ethereum height (updates)
    private startingEthHeight: number; // height of Ethereum on initialization

    private currentOsHeight: number; // current OrderStream height
    private currentProposer: string; // pub key of current block proposer

    private stakingContract: Contract; // initialized staking contract
    private stakeABI: Array<object>; // staking contract ABI
    private stakeAddr: string; // address of staking contract
    
    // persistant and output state mappings 
    private rawMapping: object; // raw rate limit mapping (addr:stakesize)
    private outMapping: object; // output stake mapping (addr:orderLimit)

    private periodLength: number // rebalance period length (Ethereum blocks)
    private periodCounter: number // incremental counter of rebalance periods

    private periodStartHeight: number; // eth starting height for period
    private periodEndHeight: number; // eth end height for period
    private periodLimit: number; // number of transactions allowed per period

    /**
     * StakeRebalancer static generator: 
     *  - you should initialize new StakeRebalancer objects with the static
     *    method StakeRebalancer.create(...options)
     * 
     * @param options {object} configuration options:
     *  - options.provider {string} desired web3 provider, must be websocket 
     *  - options.periodLength {number} length of rebalance period in Ethereum blocks
     *  - options.periodLimit {number} number of transactions allowed per period
     *  - options.stakeContractAddr {string} address of the staking contract to reference 
     *  - options.stakeContractABI {array} JSON ABI for staking contract
     *  - options.tendermintRpcHost {string} Tendermint RPC host for client
     *  - options.tendermintRpcPort {number} Tendermint RPC port for client 
     */
    static async create(options: any) {
        let rebalancer = new StakeRebalancer(options);
        await rebalancer.initialize();
        return rebalancer;
    }

    async initialize(){
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.web3provider)); // initialize Web3 instance 

        this.startingEthHeight = await this.web3.eth.getBlockNumber();
        
        this.stakingContract = new this.web3.eth.Contract(
            this.stakeABI, this.stakeAddr);
        
        this.currentEthHeight = this.startingEthHeight.valueOf();

        Logger.rebalancer("Initialized. Current Ethereum height: "+this.startingEthHeight, this.periodCounter);
        return;
    }

    /**
     * StakeRebalancer constructor (do not use): 
     *  - you should initialize new StakeRebalancer objects with the static
     *    generator `StakeRebalancer.create(...options)`
     * 
     * @param options {object} DONT USE! See .create(...) generator
     */
    private constructor(options: any){
        // May want to revisit assuming current OS height is 0 on initialization
        
        this.web3provider = options.provider;

        this.rawMapping = {};
        this.outMapping = {};

        this.currentOsHeight = 0; // see above comment
        this.periodCounter = 0;
        this.periodLength = options.periodLength; // establish period length
        this.periodLimit = options.periodLimit;

        this.stakeAddr = options.stakeContractAddr;
        this.stakeABI = options.stakeContractABI;

        this.tmHost = options.tendermintRpcHost;
        this.tmPort = options.tendermintRpcPort;
    }

    /**
     * start (public instance method): Start listening to Ethereum events. Should be called
     * after Tendermint and the ABCI application are initialized.
     */
    public start(): void{
        this.subscribe();
    }

    /**
     * getProposer (public instance method): Getter that returns current block proposer.
     */
    public getProposer(): string {
        return this.currentProposer;
    }

    /**
     * getEthereumHeight (public instance method): Returns current ethereum height.
     */
    public getEthereumHeight(): number {
        return this.currentEthHeight;
    }

    /**
     * getPeriodNumber (public instance method): Returns the current rebalance period.
     */
    public getPeriodNumber(): number {
        return this.periodCounter;
    }

    /**
     * getOrderStreamHeight (public instance method): Returns the current OS height.
     */
    public getOrderStreamHeight(): number {
        return this.currentOsHeight;
    }

    /**
     * getConstructedMapping (public instance method):
     */
    public getConstructedMapping(): any {
        return {
            validFor: this.periodCounter,
            mapping: this.outMapping
        }
    }

    /**
     * synchronize (public instance method): Use in ABCI commit() to update
     * when a new state is accepted, and it's time to move to the next round.
     * 
     * @param round {number} accepted new stake round (incrementing)
     * @param startsAt {number} accepted starting block for new period
     * @param endsAt {number} accepted ending block for new period
     */
    public synchronize(round: number, startsAt: number, endsAt: number){
        if(!(round > this.periodCounter)){
            Logger.rebalancerErr("Warning: New round should be greater than current round.");
            Logger.rebalancerErr("Warning: Node may be out of state with network.");
        } else if (round !== (this.periodCounter + 1)) {
            Logger.rebalancerErr("Warning: New round is not exactly 1 ahead of current.");
            Logger.rebalancerErr("Warning: Node may be out of state with network.");
        }

        this.periodCounter = round;
        this.periodEndHeight = endsAt;
        this.periodStartHeight = startsAt;

        this.outMapping = {};

        Logger.rebalancer(`New staking period begins at ETH block #${startsAt}, ends at ETH block #${endsAt}.`, round);
    }

    /**
     * newOrderStreamBlock (public instance method): Should be called when a new
     * OrderStream block is begun, so the ABCI application should call from 
     * BeginBlock().
     * 
     * @param height {number} the new OrderStream network block height
     * @param proposer {string} the proposer for the new OS round
     */
    public newOrderStreamBlock(height: number, proposer: string): void {
        this.currentOsHeight = height;
        this.currentProposer = proposer;
        return
    }

    /**
     * subscribe (private instance method): Subscribe to the various needed 
     * Ethereum events via Web3 connection.
     */
    private subscribe(): void {
        this.stakingContract.events.StakeMade(
            { fromBlock: 0 /*this.startingEthHeight*/ }, this.handleStakeEvent);

        this.stakingContract.events.StakeRemoved(
            { fromBlock: 0 /*this.startingEthHeight*/ }, this.handleStakeEvent);
        
        this.web3.eth.subscribe('newBlockHeaders', this.handleBlockEvent);
        return
    }

    /**
     * handleBlockEvent (private instance method): Handler method for new 
     * Ethereum blocks, and checks if the round has ended, and triggers an
     * ABCI transaction if needed.
     * 
     * Because this is a callback, it must be anonymous (ES6 arrow)
     * 
     * @param err {object} error object from web3 call
     * @param res {object} response object from web3 call
     */
    private handleBlockEvent = (err: any, res: any) => {
        if(err != null) {
            Logger.rebalancerErr(msg.rebalancer.errors.badBlockEvent);
            console.log(err);
            return;
        }

        Logger.rebalancer(`New Ethereum block found at height ${res.number}`, this.periodCounter);
        this.currentEthHeight = res.number;

        if((res.number >= this.startingEthHeight) && this.periodCounter === 0){
            // Logic for initial staking period proposal

            this.periodStartHeight = res.number;
            this.periodEndHeight = res.number + this.periodLength;
            Logger.rebalancer("Proposing initial staking period parameters.",this.periodCounter);
            this.constructOutputMapping();
            this.makeABCItransaction();
        }

        if((res.number >= this.periodEndHeight) && this.periodCounter >= 1){
            // Logic for all subsequent staking period proposals
            
            this.periodStartHeight = res.number;
            this.periodEndHeight = res.number + this.periodLength;
            
            Logger.rebalancer("Proposing parameters for new staking period.",this.periodCounter);
            this.constructOutputMapping();
            this.makeABCItransaction();
        }
    }

    /**
     * handleStakeEvent (private instance method): This method is the event 
     * handler for stake events (both StakeMade and StakeRemoved). We may want
     * to split this into two functions.
     * 
     * Because this is a callback function, it is anonymous (ES6 arrow)
     * 
     * @param err {Error} error from stake subscription callback
     * @param res {object} event object from Ethereum RPC
     */
    private handleStakeEvent = (err: any, res: any) => {
        if(err != null) {
            Logger.rebalancerErr(msg.rebalancer.errors.badStakeEvent);
            console.log(err);
            return;
        }

        let eventType = res.event;
        let staker = res.returnValues.staker.toLowerCase();
        let amount = parseInt(res.returnValues.amount);
        
        if(eventType == 'StakeMade'){
            if(this.rawMapping[staker] === undefined){
                this.rawMapping[staker] = amount; // push to mapping
                return;

            } else if(typeof(this.rawMapping[staker]) === 'number') {
                this.rawMapping[staker] += amount; // increase staked balance
                return;

            } else {
                Logger.rebalancerErr(msg.rebalancer.errors.fatalStake);
                process.exit();
                return;
            }

        } else if(eventType == 'StakeRemoved'){
            if(this.rawMapping[staker] === undefined){
                // the case where a removing staker is not in the mapping

                delete this.rawMapping[staker];
                return;

            } else if(typeof(this.rawMapping[staker]) === 'number') {
                if(this.rawMapping[staker] <= amount){
                    // the case where a staker removes their whole stake

                    delete this.rawMapping[staker];
                    return;

                } else if(this.rawMapping[staker] > amount){
                    // the case where a staker removes an amount less than their stake

                    this.rawMapping[staker] -= amount;
                    return;

                } else {
                    Logger.rebalancerErr(msg.rebalancer.errors.fatalStake);
                    process.exit();
                    return;
                }
            } else {
                Logger.rebalancerErr(msg.rebalancer.errors.fatalStake);
                process.exit();
                return;
            }
        }
    }

    private constructOutputMapping(): void {
        let stakeBalance = 0; // amount staked
        let stakeCounter = 0; // number of stakers

        Object.keys(this.rawMapping).forEach((addr, _) => {
            if(
                (this.rawMapping.hasOwnProperty(addr)) &&
                (typeof(this.rawMapping[addr]) === 'number')){
                    
                stakeBalance += this.rawMapping[addr];
            }
            stakeCounter += 1;
        });

        Object.keys(this.rawMapping).forEach((addr, _) => {
            if(
                (this.rawMapping.hasOwnProperty(addr)) &&
                (typeof(this.rawMapping[addr]) === 'number')){
                
                this.outMapping[addr] = {
                    orderBroadcastLimit: Math.floor(
                        (this.rawMapping[addr]/stakeBalance)*this.periodLimit),
                    streamBroadcastLimit: 1
                }
            }
        });

        Logger.rebalancer(`Number of stakers this period: ${stakeCounter}`, this.periodCounter);
        return;
    }
    
    /**
     * makeABCItransaction (private instance method): submit mapping as ABCI rebalance transaction.
     * Should be called at the end of a rebalance period. 
     */
    private makeABCItransaction(): void {
        if(this.tmClient === undefined || this.tmClient == null){
            // TODO: move this to a function
            
            this.tmClient = RpcClient(`ws://${this.tmHost}:${this.tmPort}`);
            this.tmClient.on('close', () => {
                // called when client is closed
                console.log("(temporary) TM client disconnected. Attempting to reconnect (not really)");
                process.exit();
            });
            this.tmClient.on('error', () => {
                // called when client has error
                console.log("(temporary) TM client error. Attempting to reconnect (not really)");
                process.exit();
            });
        }

        let txObject = {
            type: "Rebalance",
            data: {
                round: {
                    number: this.periodCounter + 1, // should this be +1 or +0???
                    startsAt: this.periodStartHeight,
                    endsAt: this.periodEndHeight
                }, 
                mapping: this.outMapping
            }
        };
 
        // encode transaction
        let payloadStr = PayloadCipher.encodeFromObject(txObject);

        // execute local ABCI transaction
        this.tmClient.broadcastTxSync({
            tx:payloadStr
        }).then((res) => {
            Logger.rebalancer("Rebalance transaction executed.", this.periodCounter);
            console.log(`(temporary) Response from TX: ${JSON.stringify(res)}`);
        }).catch((err) => {
            Logger.rebalancerErr("Error encountered while executing local ABCI transaction.");
            console.log(`(temporary) Error encountered: ${JSON.stringify(err)}`);
        });

        return;
    }
}