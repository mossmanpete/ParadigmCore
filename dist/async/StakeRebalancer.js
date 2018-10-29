"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
  =========================
  ParadigmCore: Blind Star
  StakeRebalancer.ts @ {dev}
  =========================

  @date_inital 15 October 2018
  @date_modified 27 October 2018
  @author Henry Harder

  UNSTABLE! (Okay not THAT unstable, but be careful)

  See the spec doc in ../../spec/ethereum-peg.md

  This is one of the most important and complex pieces of the OrderStream system, and will
  likely be unstable for a while. Assume that if this message is here, it should not be run
  in production.
*/
require("colors");
const Web3 = require("web3");
const url_1 = require("url");
const Logger_1 = require("../util/Logger");
const messages_1 = require("../util/messages");
const Codes_1 = require("../util/Codes");
const Broadcaster_1 = require("./Broadcaster");
class StakeRebalancer {
    /**
     * @name StakeRebalancer constructor()
     * @private
     * @description PRIVATE constructor. Do not use. Create new rebalancers
     * with StakeRebalancer.create(options)
     *
     * @param opts {object} options object - see .create()
     */
    constructor(opts) {
        /**
         * @name handleStake()
         * @description Stake event handler. NOTE: events are indexed by the block
         * they occur in, not the finality block for that event.
         *
         * @param e     {object}    error object
         * @param res   {object}    event response object
         */
        this.handleStake = (e, res) => {
            if (e !== null) {
                Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.badStakeEvent);
                return;
            }
            // Pull event parameters
            let staker = res.returnValues.staker.toLowerCase(); // Staker's address
            let rType = res.event.toLowerCase(); // Raw event type
            let amount = parseInt(res.returnValues.amount); // Amount staked
            let block = res.blockNumber; // Event block
            // Generate event object
            let event = StakeRebalancer.genEvtObject(staker, rType, amount, block);
            console.log(`in handle stake: block: ${block}`);
            console.log(`... (rebalancer) Event. type: ${event.type} staker: ${event.staker}\n\n`);
            // work on this
            // See if this is a historical event that has already matured
            if ((this.initHeight - block) > this.finalityThreshold) {
                this.updateBalance(event);
                this.execEventTx(event);
                console.log(`.... (rebalancer) balances ${JSON.stringify(this.balances)}\n\n\n`);
                return;
            }
            // If this is the first event from this block, create entry
            if (!this.events.hasOwnProperty(block)) {
                this.events[block] = [];
            }
            // Add event to confirmation queue
            this.events[block].push(event);
            console.log(`(temp) got new stake`);
            console.log(`(rebalancer) balances ${JSON.stringify(this.balances)}`);
            return;
        };
        /**
         * @name handleBlock()
         * @description New Ethereum block event handler. Updates balances and
         * executes ABCI transactions at appropriate finality blocks.
         *
         * @param e     {object}    error object
         * @param res   {object}    event response object
         */
        this.handleBlock = (e, res) => {
            if (e !== null) {
                Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.badBlockEvent);
                return;
            }
            // See if this is the first new block
            if ((this.periodNumber === 0) && (res.number > this.initHeight)) {
                Logger_1.Logger.rebalancer("Proposing parameters for initial period.", 0);
                // Prepare proposal tx
                let tx = this.genRebalanceTx(0, res.number, this.periodLength);
                // Attempt to submit
                let code = this.execAbciTx(tx);
                if (code !== Codes_1.default.OK) {
                    Logger_1.Logger.rebalancerErr(`Tx failed with code: ${code}.`);
                }
                console.log(`....../ exiting`);
                // Exit block handler function early on first block
                return;
            }
            // Update current Ethereum block
            this.currHeight = res.number;
            // Calculate which block is reaching maturity
            let matBlock = this.currHeight - this.finalityThreshold;
            console.log(`(temporary) current block is: ${this.currHeight}`);
            console.log(`(temporary) most final block is: ${matBlock}`);
            console.log(`(temporary) next round ends at: ${this.periodEnd}`);
            /*
            // TODO: is there a better way to flush historical events?
            if (Object.keys(this.events).length > 0){
                Object.keys(this.events).forEach(k => {
                    this.events[k].forEach(event => {
                        this.updateBalance(event);
                        this.execEventTx(event);
                    });
    
                    delete this.events[k];
                });
            } else { console.log('no stakes :(')}
            */
            // See if any events have reached finality
            if (this.events.hasOwnProperty(matBlock)) {
                this.events[matBlock].forEach(event => {
                    this.updateBalance(event);
                    this.execEventTx(event);
                });
                // Once all balances have been updated, delete entry
                delete this.events[matBlock];
            }
            // See if the round has ended, and submit rebalance tx if so
            if (matBlock >= this.periodEnd) {
                // Prepare transaction
                let tx = this.genRebalanceTx(this.periodNumber, this.currHeight, this.periodLength);
                // Execute ABCI transaction
                let code = this.execAbciTx(tx);
                if (code !== Codes_1.default.OK) {
                    Logger_1.Logger.rebalancerErr(`Tx failed with code: ${code}`);
                }
            }
            // Return once all tasks complete
            return;
        };
        // Check Web3 provider URL
        try {
            this.web3provider = new url_1.URL(opts.provider);
        }
        catch (err) {
            throw new Error("Invalid web3 provider URL.");
        }
        // Check Tendermint client parameters
        try {
            this.abciURI = new url_1.URL(`ws://${opts.abciHost}:${opts.abciPort}`);
        }
        catch (err) {
            throw new Error("Invalid Tendermint ABCI URL");
        }
        // Staking period parameters
        this.periodLimit = opts.periodLimit;
        this.periodLength = opts.periodLength;
        this.periodNumber = 0;
        // Finality threshold
        this.finalityThreshold = opts.finalityThreshold;
        // Staking contract parameters
        this.stakeABI = opts.stakeABI;
        this.stakeAddress = opts.stakeAddress;
        // Mapping objects
        this.events = {};
        this.balances = {};
        // Set rebalancer instance status
        this.initialized = false;
        this.started = false;
    }
    /**
     * @name genLimits()
     * @description Generates an output address:limit mapping based on a provided
     * address:balance mapping, and a total thoughput limit.
     *
     * @param balances  {object} current address:balance mapping
     * @param limit     {number} total number of orders accepted per period
     */
    static genLimits(balances, limit) {
        let total = 0; // Total amount currenty staked
        let output = {}; // Generated output mapping
        // Calculate total balance currently staked
        Object.keys(balances).forEach((k, _) => {
            if (balances.hasOwnProperty(k) && typeof (balances[k]) === 'number') {
                total += balances[k];
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
        // Return constructed output mapping.
        return output;
    }
    /**
     * Use to generate a WitnessTx event object.
     *
     * @param staker    {string}    address of staking party
     * @param type      {string}    stake type (`stakemade` or `stakeremoved`)
     * @param amount    {number}    amount staked in event
     * @param block     {number}    Ethereum block the event was recorded in.
     */
    static genEvtObject(_addr, _type, _amt, _block) {
        let type; // Parsed event type
        // Detect event type
        switch (_type) {
            case "stakemade": {
                type = "add";
                break;
            }
            case "stakeremoved": {
                type = "remove";
                break;
            }
            default: {
                throw new Error("Invalid event type.");
            }
        }
        // Construct and return event object
        return { "staker": _addr, "type": type, "amount": _amt, "block": _block };
    }
    /**
     * @name create()
     * @description Static generator to create new rebalancer instances.
     * @returns a promise that resolves to a new rebalancer instance
     *
     * @param options {object} options object with the following parameters:
     *  - options.provider          {string}    web3 provider URL
     *  - options.periodLimit       {number}    max transactions per period
     *  - options.periodLength      {number}    staking period length (ETH blocks)
     *  - options.finalityThreshold {number}    required block maturity
     *  - options.stakeABI          {array}     JSON staking contract ABI
     *  - options.stakeAddress      {string}    deployed staking contract address
     *  - options.abciHost          {string}    ABCI application RPC host
     *  - options.abciPort          {number}    ABCI application RPC port
     */
    static async create(options) {
        let instance; // Stores new StakeRebalancer instance
        try {
            // Create new rebalancer instance
            instance = new StakeRebalancer(options);
            // Initialize instance
            let code = await instance.initialize();
            // Reject promise if initialization failed
            if (code !== Codes_1.default.OK) {
                throw new Error(`Rebalancer initialization failed with code: ${code}`);
            }
        }
        catch (err) {
            // Throw error with message and code from above
            throw new Error(err.message);
        }
        // Return new instance upon successful initialization
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
        if (this.initialized && this.initHeight !== undefined) {
            return Codes_1.default.OK; // Already initialized
        }
        // Connect to Web3 provider
        let code = this.connectWeb3();
        if (code !== Codes_1.default.OK)
            return code;
        // Get current Ethereum height
        try {
            this.initHeight = await this.web3.eth.getBlockNumber();
        }
        catch (_) {
            return Codes_1.default.NO_BLOCK; // Unable to get current Ethereum height
        }
        // Create staking contract instance
        try {
            this.stakeContract = new this.web3.eth.Contract(this.stakeABI, this.stakeAddress);
        }
        catch (_) {
            return Codes_1.default.CONTRACT; // Unable to initialize staking contract
        }
        // Only returns OK upon successful initialization
        this.initialized = true;
        return Codes_1.default.OK;
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
        let subCode = this.subscribe();
        if (subCode !== Codes_1.default.OK) {
            return subCode;
        }
        // Connect to Tendermint via ABCI
        let abciCode = this.connectABCI();
        if (abciCode !== Codes_1.default.OK) {
            return abciCode;
        }
        // Successful startup
        this.started = true;
        return Codes_1.default.OK;
    }
    /**
     * @name synchronize()
     * @description Use in ABCI commit() to update when a new state is accepted
     * to update staking period parameters.
     *
     * @param round     {number}    accepted new stake round (incrementing)
     * @param startsAt  {number}    accepted starting block for new period
     * @param endsAt    {number}    accepted ending block for new period
     */
    synchronize(round, startsAt, endsAt) {
        // Check that new round is the next round
        if (round !== (this.periodNumber + 1)) {
            Logger_1.Logger.rebalancerErr("New round is not one greater than current.");
            Logger_1.Logger.rebalancerErr("Node may be out of state with network.");
        }
        // Update parameters
        this.periodNumber = round;
        this.periodStart = startsAt;
        this.periodEnd = endsAt;
        return;
    }
    /**
     * @name connectWeb3()
     * @description Used to connect to Web3 provider. Called upon
     * initialization, and if a web3 disconnect is detected.
     */
    connectWeb3() {
        let provider;
        if (typeof (this.web3) !== 'undefined') {
            this.web3 = new Web3(this.web3.currentProvider);
            return Codes_1.default.OK; // Sucessful
        }
        else {
            let protocol = this.web3provider.protocol;
            let url = this.web3provider.href;
            // Supports HTTP and WS (TODO: only WS?)
            try {
                if (protocol === 'ws:' || protocol === 'wss:') {
                    provider = new Web3.providers.WebsocketProvider(url);
                }
                else if (protocol === 'http:' || protocol === 'https:') {
                    provider = new Web3.providers.HttpProvider(url);
                }
                else {
                    // Invalid provider URI scheme
                    return Codes_1.default.URI_SCHEME;
                }
            }
            catch (_) {
                // Unable to establish provider
                return Codes_1.default.WEB3_PROV;
            }
            // Create Web3 instance
            try {
                this.web3 = new Web3(provider);
            }
            catch (_) {
                // Unable to create web3 instance
                return Codes_1.default.WEB3_INST;
            }
            // Sucessful 
            return Codes_1.default.OK;
        }
    }
    /**
     * @name connectABCI()
     * @description Connect to local Tendermint ABCI server.
     */
    connectABCI() {
        // Create broadcaster instance
        this.broadcaster = new Broadcaster_1.Broadcaster({
            host: this.abciURI.hostname,
            port: this.abciURI.port
        });
        // Connect broadcaster to Tendermint RPC
        this.broadcaster.connect();
        return Codes_1.default.OK;
    }
    /**
     * @name subscribe()
     * @description Subscribe to relevant Ethereum events and attach handlers.
     */
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
            // Unable to subscribe to events
            return Codes_1.default.SUBSCRIBE;
        }
        // Success
        return Codes_1.default.OK;
    }
    updateBalance(event) {
        // If no stake is present, set balance to stake amount
        if (!this.balances.hasOwnProperty(event.staker)) {
            this.balances[event.staker] = event.amount;
            console.log('making new bal');
            return;
        }
        switch (event.type) {
            case 'add': {
                this.balances[event.staker] += event.amount;
                console.log('adding to bal');
                return;
            }
            case 'remove': {
                this.balances[event.staker] -= event.amount;
                console.log('removing from bal');
                return;
            }
            default: {
                Logger_1.Logger.rebalancerErr("Received unknown event type.");
                return;
            }
        }
    }
    /**
     * @name generateEventTx()
     * @description Construct a new event ABCI transaction object.
     *
     * @param _staker   {string}    Ethereum address string
     * @param _type     {string}    stake event type ('add' or 'remove')
     * @param _block    {number}    block height event was mined in
     * @param _amt      {number}    amount staked or unstaked
     */
    genEventTx(_staker, _type, _block, _amt) {
        let tx = {
            type: "stake",
            data: {
                staker: _staker,
                type: _type,
                block: _block,
                amount: _amt
            }
        };
        return tx;
    }
    /**
     * @name genRebalanceTx()
     * @description Generates a rebalance transaction object by computing
     * proportional allocation of transaction throughput based on stake
     * size.
     *
     * @param _round    {number}    the current staking period number
     * @param _start    {number}    period starting ETG block number
     * @param _length   {number}    the length of each period in ETH blocks
     */
    genRebalanceTx(_round, _start, _length) {
        let map;
        if (_round === 0) {
            // Submit a blank mapping if this is the first proposal
            map = {};
        }
        else {
            // Generate a mapping based on balances otherwise
            map = StakeRebalancer.genLimits(this.balances, this.periodLimit);
        }
        // Create transaction object
        let tx = {
            type: "rebalance",
            data: {
                round: {
                    number: _round + 1,
                    startsAt: _start,
                    endsAt: _start + _length,
                    limit: this.periodLimit
                },
                limits: map
            }
        };
        // Return constructed transaction object
        return tx;
    }
    /**
     * @name execEventTx()
     * @description Generate and send and event witness transaction.
     *
     * @param event     {object}    event object
     */
    execEventTx(event) {
        let tx = this.genEventTx(event.staker, event.type, event.block, event.amount);
        let code = this.execAbciTx(tx);
        if (code !== 0) {
            Logger_1.Logger.rebalancerErr("Event Tx failed.");
        }
        return;
    }
    /**
     * @name execAbciTx()
     * @description Encodes and compresses a transactions, then submits it to
     * Tendermint via the local ABCI server.
     *
     * @param _tx   {object}    raw transaction object
     */
    execAbciTx(_tx) {
        /* todo add queue?
        if (this.abciClient === undefined) {
            Logger.rebalancerErr("ABCI client not connected.");
            return err.NO_ABCI;
        }

        // Encode and compress transaction
        let payload = PayloadCipher.encodeFromObject(_tx);

        // Execute ABCI transaction
        this.abciClient.broadcastTxAsync({
            tx: payload
        }).then(r => {
            Logger.rebalancer("ABCI Transaction executed.", this.periodNumber);
        }).catch(e => {
            Logger.rebalancerErr("Failed to execute ABCI transaction.");
        });
        */
        try {
            this.broadcaster.add(_tx);
        }
        catch (e) {
            console.log('(not in BROADCASTER) sending tx failed.');
        }
        // Will return OK unless ABCI is disconnected
        return Codes_1.default.OK;
    }
}
exports.StakeRebalancer = StakeRebalancer;
