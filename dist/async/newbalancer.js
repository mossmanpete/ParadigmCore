"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let Web3 = require("web3");
const url_1 = require("url");
const tendermint_1 = require("tendermint");
const Logger_1 = require("../util/Logger");
const messages_1 = require("../util/messages");
class StakeRebalancer {
    /**
     * @name constructor()
     * @private
     * @description PRIVATE constructor. Do not use. Create new rebalancers
     * with StakeRebalancer.create(options)
     *
     * @param options {object} see .create()
     */
    constructor(options) {
        this.handleStake = (err, res) => {
            if (err !== null) {
                Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.badStakeEvent);
                return;
            }
            let eventType = res.event.toLowerCase();
            let staker = res.returnValues.staker.toLowerCase();
            let amount = parseInt(res.returnValues.amount);
            let block = parseInt(res.blockNumber);
            console.log(`(tempt) event:`);
            console.log(`... type: ${eventType}`);
            console.log(`... staker: ${staker}`);
            console.log(`... amount: ${amount}`);
            console.log(`... block: ${block}`);
            return;
        };
        this.handleBlock = (err, res) => {
            console.log('skipping block event');
            return;
        };
        try {
            this.web3provider = new url_1.URL(options.provider);
        }
        catch (err) {
            throw new Error("Invalid web3 provider URL.");
        }
        // Staking period parameters
        this.periodLimit = options.periodLimit;
        this.periodLength = options.periodLength;
        // Staking contract parameters
        this.stakeABI = options.stakeABI;
        this.stakeAddress = options.stakeAddress;
        // Tendermint client parameters
        this.abciURI = new url_1.URL(`ws://${options.abciHost}:${options.abciPort}`);
        // Set rebalancer instance status
        this.initialized = false;
        this.started = false;
    }
    /**
     * @name generateLimits()
     * @description Generates an output address:limit mapping based on a provided
     * address:balance mapping, and a total thoughput limit.
     *
     * @param balances  {object} current address:balance mapping
     * @param limit     {number} total number of orders accepted per period
     */
    static generateLimits(balances, limit) {
        let total; // total amount currenty staked
        let stakers; // total number of stakers
        let output = {}; // generated output mapping
        // Calculate total balance currently staked
        Object.keys(balances).forEach((k, _) => {
            if (balances.hasOwnProperty(k) && typeof (balances[k]) === 'number') {
                total += balances[k];
                stakers += 1;
            }
        });
        // Compute the rate-limits for each staker based on stake size
        Object.keys(balances).forEach((k, _) => {
            if (balances.hasOwnProperty(k) && typeof (balances[k]) === 'number') {
                output[k] = {
                    // orderLimit is proportional to stake size
                    orderLimit: Math.floor((balances[k] / total) * limit),
                    // streamLimit is always 1, regardless of stake size
                    streamLimit: 1
                };
            }
        });
        // return [output, stakers];
        return output;
    }
    /**
     * @name create()
     * @description Static generator to create new rebalancer instances.
     * @returns a promise that resolves to a new rebalancer instance
     *
     * @param options {object} options object with the following parameters:
     *  - options.web3provider  {string}    web3 provider URL
     *  - options.periodLimit   {number}    max transactions per period
     *  - options.periodLength  {number}    staking period length (ETH blocks)
     *  - options.stakeABI      {array}     JSON staking contract ABI
     *  - options.stakeAddress  {string}    deployed staking contract address
     */
    static async create(options) {
        let instance; // stores new StakeRebalancer instance
        try {
            instance = new StakeRebalancer(options);
            let code = await instance.initialize();
            if (code !== 0) {
                throw new Error(`ERRCODE: ${code}`);
            }
        }
        catch (err) {
            throw new Error(err.message);
        }
        return instance;
    }
    /**
     * @name initialize()
     * @description Initialize rebalancer instance by connecting to a web3
     * endpoint and instantiating contract instance. Uses error codes.
     *
     * @returns (a promise that resolves to) 0 if OK
     */
    async initialize() {
        if (this.initialized) {
            return 5; // Already initialized
        }
        let provider; // Web3 provider instance
        // Establish web3 connection
        if (typeof (this.web3) !== 'undefined') {
            this.web3 = new Web3(this.web3.currentProvider);
        }
        else {
            let protocol = this.web3provider.protocol;
            let url = this.web3provider.href;
            if (protocol === 'ws:' || protocol === 'wss:') {
                provider = new Web3.providers.WebsocketProvider(url);
            }
            else if (protocol === 'http:' || protocol === 'https:') {
                provider = new Web3.providers.HttpProvider(url);
            }
            else {
                return 1; // Invalid provider URI scheme
            }
            try {
                this.web3 = new Web3(provider);
            }
            catch (_) {
                return 2; // Unable to connect to web3 provider
            }
        }
        // Get current Ethereum height
        try {
            this.initHeight = await this.web3.eth.getBlockNumber();
        }
        catch (_) {
            return 3; // Unable to get current Ethereum height
        }
        // Create staking contract instance
        try {
            this.stakeContract = new this.web3.eth.Contract(this.stakeABI, this.stakeAddress);
        }
        catch (_) {
            return 4; // Unable to initialize staking contract
        }
        // Only returns 0 upon successful initialization
        this.initialized = true;
        return 0;
    }
    /**
     * @name start()
     * @description Starts rebalancer instance after node synchronization,
     * and connects to local Tendermint instance via ABCI.
     *
     * @returns 0 if OK
     */
    start() {
        // Subscribe to Ethereum events
        let code = this.subscribe();
        // Immediate failure
        if (code !== 0) {
            return 1;
        }
        // Connect to local Tendermint instance
        // TODO: move to function
        try {
            if (this.abciClient === undefined) {
                this.abciClient = tendermint_1.RpcClient(this.abciURI.href);
                this.abciClient.on('close', () => {
                    console.log('(temp) client disconnected.');
                });
                this.abciClient.on('error', () => {
                    console.log('(temp) error in abci client');
                });
                Logger_1.Logger.rebalancer("Connected to Tendermint via ABCI", this.periodNumber);
            }
        }
        catch (err) {
            return 2; // Unable to establish ABCI connection
        }
        // Success
        this.started = true;
        return 0;
    }
    subscribe() {
        try {
            // Subscribe to 'stakeMade' events
            this.stakeContract.events.StakeMade({
                fromBlock: 0
            }, this.handleStake);
            // Subscribe to 'stakeRemoved' events
            this.stakeContract.events.StakeRemoved({
                fromBlock: 0
            }, this.handleStake);
            // Subscribe to new blocks
            this.web3.eth.subscribe('newBlockHeaders', this.handleBlock);
        }
        catch (_) {
            return 1; // Unable to subscribe to events
        }
        return 0;
    }
    synchronize(a, b, c) {
        console.log('syncing');
    }
}
exports.StakeRebalancer = StakeRebalancer;
