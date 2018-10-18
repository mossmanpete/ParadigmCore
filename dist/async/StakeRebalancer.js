"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  StakeRebalancer.ts @ {rebalance-refactor}
  =========================

  @date_inital 15 October 2018
  @date_modified 16 October 2018
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
Object.defineProperty(exports, "__esModule", { value: true });
let Web3 = require('web3');
const Logger_1 = require("../util/Logger");
const messages_1 = require("../util/messages");
class StakeRebalancer {
    /**
     * StakeRebalancer constructor:
     *  - you should initialize new StakeRebalancer objects with the static
     *    method StakeRebalancer.create(...options)
     *
     * @param options {object} DONT USE! See .create(...)
     */
    constructor(options) {
        /**
         * May want to revisit assuming current OS height is 0 on initialization
         */
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
        this.handleBlockEvent = (err, res) => {
            if (err != null) {
                Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.badBlockEvent);
                return;
            }
            this.currentEthHeight = res.number;
            Logger_1.Logger.rebalancer(`New Ethereum block, height ${res.number}`, this.periodCounter);
            if (res.number >= this.periodEndHeight) {
                this.constructOutputMapping();
                this.makeABCItransaction();
            }
        };
        /**
         * handleStakeEvent (private instance method): This method is the event
         * handler for stake events (both StakeMade and StakeRemoved). We may want
         * to split this into two functions.
         *
         * Again, not sure why it doesn't work if it is not an ES6 arrow function.
         */
        this.handleStakeEvent = (err, res) => {
            if (err != null) {
                Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.badStakeEvent);
                return;
            }
            let eventType = res.event;
            let staker = res.returnValues.staker;
            let amount = parseInt(res.returnValues.amount);
            // let blockNo = parseInt(res.blockNumber);
            // if((blockNo >= this.periodStartHeight) && (blockNo <= this.periodEndHeight)){
            if (eventType == 'StakeMade') {
                if (this.rawMapping[staker] === undefined) {
                    this.rawMapping[staker] = amount; // push to mapping
                    return;
                }
                else if (typeof (this.rawMapping[staker]) === 'number') {
                    this.rawMapping[staker] += amount; // increase staked balance
                    return;
                }
                else {
                    Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.fatalStake);
                    process.exit();
                    return;
                }
            }
            else if (eventType == 'StakeRemoved') {
                if (this.rawMapping[staker] === undefined) {
                    // the case where a removing staker is not in the mapping
                    delete this.rawMapping[staker];
                    return;
                }
                else if (typeof (this.rawMapping[staker]) === 'number') {
                    if (this.rawMapping[staker] <= amount) {
                        // the case where a staker removes their whole stake
                        delete this.rawMapping[staker];
                        return;
                    }
                    else if (this.rawMapping[staker] > amount) {
                        // the case where a staker removes an amount less than their stake
                        this.rawMapping[staker] -= amount;
                        return;
                    }
                    else {
                        Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.fatalStake);
                        process.exit();
                        return;
                    }
                }
                else {
                    Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.fatalStake);
                    process.exit();
                    return;
                }
            }
        };
        this.rawMapping = {};
        this.outMapping = {};
        this.currentOsHeight = 0; // see above comment
        this.periodCounter = 0;
        this.periodLength = options.periodLength; // establish period length
        this.periodLimit = options.periodLimit;
        this.web3provider = options.provider;
        this.stakeAddr = options.stakeContractAddr;
        this.stakeABI = options.stakeContractABI;
    }
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
    static async create(options) {
        let rebalancer = new StakeRebalancer(options);
        await rebalancer.initialize();
        return rebalancer;
    }
    async initialize() {
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.web3provider)); // initialize Web3 instance 
        this.startingEthHeight = await this.web3.eth.getBlockNumber();
        this.stakingContract = new this.web3.eth.Contract(this.stakeABI, this.stakeAddr);
        this.subscribe();
        this.currentEthHeight = this.startingEthHeight.valueOf();
        this.periodStartHeight = this.currentEthHeight.valueOf();
        this.periodEndHeight = this.periodStartHeight.valueOf() + this.periodLength.valueOf();
        Logger_1.Logger.rebalancer("Initialized. Current Ethereum height: " + this.startingEthHeight, this.periodCounter);
        Logger_1.Logger.rebalancer("First round ends at Ethereum height: " + this.periodEndHeight, this.periodCounter);
    }
    /**
     * proposer (public getter): Getter that returns current block proposer.
     */
    get proposer() {
        return this.currentProposer;
    }
    /**
     * ethereumHeight (public getter): Returns current ethereum height.
     */
    get ethereumHeight() {
        return this.currentEthHeight;
    }
    /**
     * periodNumber (public getter): Returns the current rebalance period.
     */
    get periodNumber() {
        return this.periodCounter;
    }
    /**
     * currentOSheight (public getter): Returns the current OS height.
     */
    get orderStreamHeight() {
        return this.currentOsHeight;
    }
    /**
     * newOrderStreamBlock (public instance method): Should be called when a new
     * OrderStream block is begun, so the ABCI application should call from
     * BeginBlock().
     *
     * @param height {number} the new OrderStream network block height
     * @param proposer {string} the proposer for the new OS round
     */
    newOrderStreamBlock(height, proposer) {
        this.currentOsHeight = height;
        this.currentProposer = proposer;
        return;
    }
    /**
     * subscribe (private instance method): Subscribe to the various needed
     * Ethereum events via Web3 connection.
     */
    subscribe() {
        this.stakingContract.events.StakeMade({ fromBlock: 0 /*this.startingEthHeight*/ }, this.handleStakeEvent);
        this.stakingContract.events.StakeRemoved({ fromBlock: 0 /*this.startingEthHeight*/ }, this.handleStakeEvent);
        this.web3.eth.subscribe('newBlockHeaders', this.handleBlockEvent);
        return;
    }
    /**
     * resetPeriod (private instance method): should be called at some point
     * during the inevitable slew of "new rebalance period" methods.
     */
    resetPeriod() {
        Logger_1.Logger.rebalancer("Round ended.", this.periodCounter);
        this.outMapping = {}; // eventually create classes
        // // this.periodBalance = 0; // reset staked balance to 0
        this.periodCounter += 1; // new stake period
        this.periodStartHeight = this.currentEthHeight;
        this.periodEndHeight = this.periodStartHeight + this.periodLength;
        Logger_1.Logger.rebalancer("New period starting:", this.periodCounter);
        Logger_1.Logger.rebalancer(`... starts @ ${this.periodStartHeight}`, this.periodCounter);
        Logger_1.Logger.rebalancer(`... ends @ ${this.periodEndHeight}`, this.periodCounter);
        Logger_1.Logger.rebalancer(`... current block: ${this.currentEthHeight}`, this.periodCounter);
    }
    constructOutputMapping() {
        let stakeBalance = 0;
        Object.keys(this.rawMapping).forEach((addr, _) => {
            if (typeof (this.rawMapping[addr]) === 'number') {
                stakeBalance += this.rawMapping[addr];
            }
        });
        Object.keys(this.rawMapping).forEach((addr, _) => {
            if (typeof (this.rawMapping[addr]) === 'number') {
                this.outMapping[addr] = {
                    OrderBroadcastLimit: Math.floor((this.rawMapping[addr] / stakeBalance) * this.periodLimit),
                    StreamBroadcastLimit: 1
                };
            }
        });
    }
    /**
     * makeABCItransaction (private instance method): submit mapping as ABCI rebalance transaction.
     * Should be called at the end of a rebalance period.
     */
    makeABCItransaction() {
        let txObject = {
            type: "Rebalance",
            data: {
                round: this.periodCounter + 1,
                mapping: this.outMapping
            }
        };
        console.log("$$$ Making abci transaction (lol)");
        console.log(`$$$ Raw mapping: ${JSON.stringify(this.rawMapping)}`);
        console.log(`$$$ Out mapping: ${JSON.stringify(this.outMapping)}`);
        // actually send transaction to ABCI here
        this.resetPeriod();
        return;
    }
}
exports.StakeRebalancer = StakeRebalancer;
