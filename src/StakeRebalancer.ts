/*
  =========================
  ParadigmCore: Blind Star
  StakeRebalancer.ts @ {master}
  =========================

  @date_inital 15 October 2018
  @date_modified 15 October 2018
  @author Henry Harder

  UNSTABLE! UNSTABLE! UNSTABLE! UNSTABLE!

  This class enables nodes to construct a rate-limit mapping of address:limit for each access
  control period on Ethereum (rebalance period). At the end of each listening period, it will
  trigger an ABCI transaction, which if deemed valid, updates the state of the network with 
  the new rate-limit mapping.

  This is one of the most important and complex pieces of the OrderStream system, and will 
  likely be unstable for a while. Assume that if this message is here, it should not be run 
  in production. 
*/

let Web3 = require('web3');
import Contract from "web3/eth/contract";

import { Logger } from "./Logger";
import { EventEmitter } from "web3/types";

export class StakeRebalancer {
    private web3provider: string;
    private web3: any; // web3 instance

    private currentEthHeight: number; // current Ethereum height (updates)
    private startingEthHeight: number; // height of Ethereum on initialization

    private currentOsHeight: number; // current OrderStream height
    private currentProposer: string; // pub key of current block proposer

    private stakingContract: Contract; // initialized staking contract
    private stakeABI: Array<object>; // staking contract ABI
    private stakeAddr: string; // address of staking contract
    
    // temporary and final state mappings 
    private rawMapping: object; // raw rate limit mapping (addr:stakesize)
    private outMapping: object; // output stake mapping

    private periodLength: number // rebalance 'listening' period length (Ethereum blocks)
    private periodCounter: number // incremental counter of rebalance periods

    private periodStartHeight: number; // eth starting height for period
    private periodEndHeight: number; // eth end height for period
    private periodBalance: number; // staked balance for period (in wei)
    private periodLimit: number; // number of transactions allowed per period

    private periodStakers: Array<object>; // array of (addr:stake)

    /**
     * StakeRebalancer static constructor: 
     *  - you should initialize new StakeRebalancer objects with the static
     *    method StakeRebalancer.create(...options)
     * 
     * @param options {object} configuration options:
     *  - options.provider {string} desired web3 provider, must be websocket 
     *  - options.periodLength {number} length of rebalance period in Ethereum blocks
     *  - options.periodLimit {number} number of transactions allowed per period
     *  - options.stakeContractAddr {string} address of the staking contract to reference 
     *  - options.stakeContractABI {array} JSON ABI for staking contract 
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
        
        this.subscribe();

        this.currentEthHeight = this.startingEthHeight.valueOf();
        this.periodStartHeight = this.currentEthHeight.valueOf();
        this.periodEndHeight = this.periodStartHeight.valueOf() + this.periodLength.valueOf();

        Logger.rebalancer("Initialized. Starting block is: "+ this.startingEthHeight);
        Logger.rebalancer("First round ends at block: " + this.periodEndHeight);
    }

    /**
     * StakeRebalancer constructor: 
     *  - you should initialize new StakeRebalancer objects with the static
     *    method StakeRebalancer.create(...options)
     * 
     * @param options {object} DONT USE! See .create(...)
     */
    constructor(options: any){
        /**
         * May want to revisit assuming current OS height is 0 on initialization
         */
        this.currentOsHeight = 0; // start at 0
        this.periodCounter = 0;

        this.periodStakers = [];
        this.periodLength = options.periodLength; // establish period length

        this.web3provider = options.provider;
        this.stakeAddr = options.stakeContractAddr;
        this.stakeABI = options.stakeContractABI;
    }

    /**
     * proposer (public getter): Getter that returns current block proposer
     */
    get proposer(): string {
        return this.currentProposer;
    }

    /**
     * ethereumHeight (public getter): Returns current ethereum height
     */
    get ethereumHeight(): number {
        return this.currentEthHeight;
    }

    /**
     * periodNumber (public getter) 
     */
    get periodNumber(): number {
        return this.periodCounter;
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

        Logger.rebalancer(`srb: new os block ${height} and proposer ${proposer}`)
    }

    /**
     * subscribe (private instance method): Subscribe to the various needed 
     * Ethereum events via Web3 connection.
     */
    private subscribe(): void {
        this.stakingContract.events.StakeMade(
            { fromBlock: this.startingEthHeight }, this.handleStakeEvent);

         this.stakingContract.events.StakeRemoved(
            { fromBlock: this.startingEthHeight }, this.handleStakeEvent);
        
        this.web3.eth.subscribe('newBlockHeaders', this.handleBlockEvent);
        
        return null
    }

    /**
     * handleBlockEvent (private instance method): Handler method for new 
     * Ethereum blocks, and checks if the round has ended, and triggers an
     * ABCI transaction if needed.
     * 
     * For some reason this doesn't work unless it is an ES6 arrow function.
     * 
     * @param err {object} error object from web3 call
     * @param res {object} response object from web3 call
     */
    private handleBlockEvent = (err: any, res: any) => {
        if(err != null) {
            console.log("bad event: " + err);
            return null
        }

        this.currentEthHeight = res.number;
        Logger.rebalancer(`New ethereum block: ${res.number}`);
        Logger.rebalancer(`Period #${this.periodCounter} ends @ ${this.periodEndHeight}`);

        if(res.number >= this.periodEndHeight){
            Logger.rebalancer('round should end now.');
            // construct mapping
            this.makeABCItransaction();
        }
    }

    /**
     * handleStakeEvent (private instance method): This method is the event 
     * handler for stake events (both StakeMade and StakeRemoved). We may want
     * to split this into two functions.
     * 
     * Again, not sure why it doesn't work if it is not an ES6 arrow function.
     */
    private handleStakeEvent = (err: any, res: any) => {
        if(err != null) {
            console.log("bad stake: " + err);
            return null
        }

        let staker = res.returnValues.staker;
        let amount = res.returnValues.amount;
        let blockNo = res.blockNumber;
        let eventType = res.event;

        if((blockNo >= this.periodStartHeight) && (blockNo <= this.periodEndHeight)){
            if(eventType == 'StakeMade'){
                console.log('stakemade event');
                let stakeObj = {}
                stakeObj[staker] = amount;
                this.periodStakers.push(stakeObj); // push to mapping

            } else if(eventType == 'StakeRemoved'){
                console.log('stakeremoved event');
                // what should happen if the stake is removed?
            }
        } else {
            // logic if event was outside period bounds
            console.log('** else block reached');
        }
    }

    /**
     * resetPeriod (private instance method): should be called at some point
     * during the inevitable slew of "new rebalance period" methods.
     */
    private resetPeriod() { // reset mappings
        // this.currentEthHeight = height; // should only be updated by block handler?
        // set round starting height

        console.log('reseting period');

        
        this.rawMapping = {};
        this.outMapping = {}; // eventually create objects

        // // this.periodBalance = 0; // reset staked balance to 0
        this.periodCounter += 1; // new stake period
        this.periodStartHeight = this.currentEthHeight;
        this.periodEndHeight = this.periodStartHeight + this.periodLength;
        
        console.log("new period starting:")
        console.log(`... starts @ ${this.periodStartHeight}`);
        console.log(`... ends @ ${this.periodEndHeight}`);
        console.log(`... current block: ${this.currentEthHeight}`);
    }
    
    /**
     * makeABCItransaction (private instance method): submit mapping as ABCI rebalance transaction.
     * Should be called at the end of a rebalance period. 
     */
    private makeABCItransaction(): void {
        console.log("making abci transaction (lol)");
        console.log(this.periodStakers);
        this.resetPeriod();
        return
    }
}