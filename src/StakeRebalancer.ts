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
import { EventEmitter } from "web3/types";

export class StakeRebalancer {
    private web3provider: string;
    private web3: any; // web3 instance

    private currentEthHeight: number; // current Ethereum height (updates)
    private startingEthHeight: number; // height of Ethereum on initialization

    private currentOsHeight: number; // current OrderStream height
    private currentProposer: string; // pub key of current block proposer

    private stakeMadeEmitter: EventEmitter;
    private stakeRemovedEmitter: EventEmitter;

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
        this.currentEthHeight = this.startingEthHeight;

        this.periodStartHeight = this.currentEthHeight;
        this.periodEndHeight = this.periodStartHeight + this.periodLength;
        
        this.stakingContract = new this.web3.eth.Contract(
            this.stakeABI, this.stakeAddr);
        
        console.log("initialized. starting block is: "+ this.startingEthHeight);
        this.subscribe();
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
        this.periodLength = options.periodLength; // establish rebalance period length

        this.web3provider = options.provider;
        this.stakeAddr = options.stakeContractAddr;
        this.stakeABI = options.stakeContractABI;
    }

    /**
     * Getter method that returns current block proposer
     */
    get proposer(): string {
        return this.currentProposer;
    }

    /**
     * Setter method to establish current proposer, and increase TM height
     * Should be called in `beginBlock()`
     * @param proposer {string}: new proposer pub key
     */
    set proposer(proposer: string){
        this.currentProposer = proposer;
        this.currentOsHeight += 1; // increase height by 1

        // below is for debugging
        console.log(`Current height: ${this.currentOsHeight}`);
        console.log(`Current proposer: ${this.currentProposer}`);
    }

    /**
     * Returns current ethereum height (for syncing)
     */
    get ethereumHeight(){
        return this.currentEthHeight;
    }

    /**
     * subscribe (instance method): subscribe to the various needed ethereum events
     */
    private subscribe(): void {
        this.stakingContract.events.StakeMade(
            { fromBlock: 0 }, this.handleStakeEvent);

        this.stakingContract.events.StakeRemoved(
            { fromBlock: 0 }, this.handleStakeEvent);
        
        this.web3.eth.subscribe('newBlockHeaders', this.handleBlockEvent);
    }

    /**
     * handleBlockEvent (instance method): handler method for new Ethereum blocks,
     * checks if the round has ended, and triggers an ABCI transaction if needed.
     * 
     * @param err {object} error object from web3 call
     * @param res {object} response object from web3 call
     */
    private handleBlockEvent(err: any, res: any): void {
        if(err != null) {
            console.log("bad event");
            return
        }

        this.currentEthHeight = res.number;
        console.log(`new ethereum block: ${res.number}`);

        if(res.number >= this.periodEndHeight){
            // construct mapping
            this.makeABCItransaction();
        }
    }

    private handleStakeEvent(err: any, res: any): void {
        if(err != null) {
            console.log("bad stake");
            return
        }

        let staker = res.returnValues.staker;
        let amount = res.returnValues.amount;
        let blockNo = res.blockNumber;
        let eventType = res.event;

        if((blockNo >= this.periodStartHeight) && (blockNo <= this.periodEndHeight)){
            if(eventType == 'StakeMade'){
                console.log('stakemade event');
                this.periodStakers.push({
                    staker : amount 
                });
            } else if(eventType == 'StakeRemoved'){
                console.log('stakeremoved event');
                // what should happen if the stake is removed?
            }
        } else {
            // logic if event was outside period bounds
        }
        
        // for debugging - remove
        console.log(`@block #${blockNo} stake made by ${staker}`);
    }

    /**
     * resetPeriod (instance method): should be called at some point during the slew
     * of "new rebalance period" methods.
     * 
     * @param height {number} the starting height for the next stake period
     */
    private resetPeriod(height: number) { // reset mappings
        // this.currentEthHeight = height; // should only be updated by block handler?
        // set round starting height

        this.rawMapping = {};
        this.outMapping = {}; // eventually create objects

        // this.periodBalance = 0; // reset staked balance to 0
        this.periodCounter += 1; // new stake period
        this.periodStartHeight = this.currentEthHeight;
        this.periodEndHeight = this.periodStartHeight + this.periodLength; 
    }
    
    /**
     * newOrderStreamBlock (instance method): should be called when a new OrderStream block
     * is begin, so the ABCI application should call from BeginBlock()
     * 
     * @param height {number} the new OrderStream network block height
     */
    private newOrderStreamBlock(height: number): void {
        this.currentOsHeight = height;

        // or 

        // this.currentOsHeight += 1; 
    }

    /**
     * makeABCItransaction (instance method): submit mapping as ABCI rebalance transaction.
     * Should be called at the end of a rebalance period. 
     */
    private makeABCItransaction(): void {
        console.log("making abci transaction (lol)");
        return
    }
}