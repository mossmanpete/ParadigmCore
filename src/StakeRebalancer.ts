/*
  =========================
  ParadigmCore: Blind Star
  StakeRebalancer.ts @ {master}
  =========================

  @date_inital 15 October 2018
  @date_modified 15 October 2018
  @author Henry Harder

  UNSTABLE UNSTABLE UNSTABLE UNSTABLE

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
    private periodLength: number // rebalance period length (Ethereum blocks)
    private periodCounter: number // incremental counter of rebalance periods

    private currentEthHeight: number; // current Ethereum height (updates)
    private startingEthHeight: number // height of Ethereum on initialization

    private currentOsHeight: number; // current OrderStream height
    private currentProposer: string; // pub key of current block proposer

    private stakeMadeEmitter: EventEmitter;
    private stakeRemovedEmitter: EventEmitter;

    private stakingContract: Contract; // initialized staking contract
    private stakeABI: Array<object>; // staking contract ABI
    private stakeAddr: string; // address of staking contract
    
    private mapping: object; // rate limit mapping

    static async create(options: any) {
        let rebalancer = new StakeRebalancer(options);
        await rebalancer.initialize();
        return rebalancer;
    }

    async initialize(){
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.web3provider)); // initialize Web3 instance 

        this.startingEthHeight = await this.web3.eth.getBlockNumber();
        this.currentEthHeight = this.startingEthHeight;
        
        this.stakingContract = new this.web3.eth.Contract(
            this.stakeABI, this.stakeAddr);
        
        this.subscribe();
    }

    /**
     * StakeRebalancer constructor: USE StakeRebalancer.create(...)
     * @param options {object} configuration options:
     *  - options.provider: desired web3 provider, must be websocket {string} (optional)
     *  - options.periodLength: length of rebalance period in Ethereum blocks {number} (required)
     *  - options.stakeContractAddr: address of the staking contract to reference {string} (required)
     *  - options.stakeContractABI: JSON ABI for staking contract {array} (required)
     */
    constructor(options: any){
        /**
         * May want to revisit assuming current OS height is 0 on initialization
         */
        this.currentOsHeight = 0; // start at 0
        this.periodCounter = 0;

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

    private subscribe(): void {
        console.log("in subscribe: " + this.ethereumHeight);
        this.stakeMadeEmitter = this.stakingContract.events.StakeMade({}, this.handleStake);
        this.stakeRemovedEmitter = this.stakingContract.events.StakeRemoved({}, this.handleStake);
    }

    private handleStake(err: any, res: any): void {
        if(err != null) {
            // for debug - remove
            console.log("bad stake");
            return
        } else {
            let staker = res.returnValues.staker;
            // let amount = res.returnValues.amount;
            let blockno = res.blockNumber;
            
            // for debugging - remove
            console.log(`@block #${blockno} stake made by ${staker}`);
        }
    }
}