/**
  =========================
  ParadigmCore: Blind Star
  StakeRebalancer.ts @ {master}
  =========================

  @date_initial 15 October 2018
  @date_modified 1 November 2018
  @author Henry Harder

  This class may not be fully stable. See the spec doc in ../../spec/ethereum-peg.md

  This is one of the most important and complex pieces of the OrderStream system, and will 
  likely be unstable for a while. Assume that if this message is here, it should not be run 
  in production. 

  UPDATE: as of 1 November, I consider this to be damn close to stability.
*/

// Third party and stdlib imports
import Web3 = require('web3');
import Contract from "web3/eth/contract";
import { URL } from "url";
import { Provider } from "web3/providers";

// ParadigmCore modules/classes
import { Logger } from "../util/Logger";
import { messages as msg } from "../util/static/messages";
import { TxBroadcaster } from "../abci/TxBroadcaster";
import { Transaction } from '../abci/Transaction';
import { default as err } from "../util/Codes";

export class StakeRebalancer {

    // Web3 instance variables
    private web3provider: URL;  // Web3 provider URI
    private web3: Web3;         // Web3 instance

    // Ethereum related variables
    private finalityThreshold: number;  // Block maturity threshold
    private initHeight: number;         // Ethereum height upon initialization
    private currHeight: number;         // Best known ETH block

    // Staking period parameters
    private periodNumber: number;   // Incremental period counter
    private periodLength: number;   // Length of each period in ETH blocks
    private periodLimit: number;    // Transactions accepted each period
    private periodStart: number;    // Current period start height
    private periodEnd: number;      // Current period ending height

    // Staking contract configuration
    private stakeContract: Contract;    // Staking contract instance
    private stakeABI: Array<object>;    // Staking contract ABI
    private stakeAddress: string;       // Staking contract address

    // Tendermint ABCI connection
    private broadcaster: TxBroadcaster;   // ABCI Tx broadcaster and queue

    // Event, balance and limit mappings (out-of-state)
    private events: any;        // Events pending maturity threshold
    private balances: any;      // The address:stake_amount mapping

    /**
     * Generates an output address:limit mapping based on a provided
     * address:balance mapping, and a total throughput limit.
     * 
     * @param balances  {object} current address:balance mapping
     * @param limit     {number} total number of orders accepted per period
     */
    public static genLimits(balances: any, limit: number): any {
        let total: number = 0;      // Total amount currently staked
        let output: object = {};    // Generated output mapping

        // Calculate total balance currently staked
        Object.keys(balances).forEach((k, _) => {
            if (balances.hasOwnProperty(k) && typeof(balances[k]) === 'number') {
                total += balances[k];
            }
        });

        // Compute the rate-limits for each staker based on stake size
        Object.keys(balances).forEach((k, _) => {
            if (balances.hasOwnProperty(k) && typeof(balances[k]) === 'number') {
                output[k] = {
                    // orderLimit is proportional to stake size
                    orderLimit: Math.floor((balances[k] / total) * limit),

                    // streamLimit is always 1, regardless of stake size
                    streamLimit: 1
                }
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
    public static genEvtObject(_addr, _type, _amt, _block): any {
        let type: string; // Parsed event type

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
        return {"staker": _addr, "type": type, "amount": _amt, "block": _block};
    }

    /**
     * Static generator to create new rebalancer instances.
     * 
     * @returns Promise that resolves to a new rebalancer instance.
     * 
     * @param options {object} options object with the following parameters:
     *  - options.provider          {string}    web3 provider URL
     *  - options.periodLimit       {number}    max transactions per period
     *  - options.periodLength      {number}    staking period length (ETH blocks)
     *  - options.finalityThreshold {number}    required block maturity
     *  - options.stakeABI          {array}     JSON staking contract ABI
     *  - options.stakeAddress      {string}    deployed staking contract address
     *  - options.broadcaster       {TxBroadcaster}    broadcaster instance
     */
    public static async create(options: any): Promise<StakeRebalancer> {
        let instance;   // Stores new StakeRebalancer instance

        try {
            // Create new rebalancer instance
            instance = new StakeRebalancer(options);

            // Initialize instance
            let code = await instance.initialize();

            // Reject promise if initialization failed
            if (code !== err.OK) {
                throw new Error(`Rebalancer initialization failed with code: ${code}`)
            }
        } catch (err) {
            // Throw error with message and code from above
            throw new Error(err.message);
        }

        // Return new instance upon successful initialization
        return instance;
    }
    
    /**
     * PRIVATE constructor. Do not use. Create new rebalancers with 
     * StakeRebalancer.create(options)
     * 
     * @param opts {object} options object - see .create() docstring
     */
    private constructor(opts: any) {
        // Check Web3 provider URL
        try {
            this.web3provider = new URL(opts.provider);
        } catch (err) {
            throw new Error("Invalid web3 provider URL.");
        }

        // Staking period parameters
        this.periodLimit = opts.periodLimit;
        this.periodLength = opts.periodLength;
        this.periodNumber = 0;

        // Local ABCI transaction broadcaster
        this.broadcaster = opts.broadcaster;

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
     * Initialize rebalancer instance by connecting to a web3 endpoint and
     * instantiating contract instance. Uses error codes.
     * 
     * @returns Promise that resolves to 0 if OK
     */
    public async initialize(): Promise<number> {
        if (this.initialized && this.initHeight !== undefined) {
            return err.OK; // Already initialized
        }
        
        // Connect to Web3 provider
        let code = this.connectWeb3();
        if (code !== err.OK) return code;
        
        // Get current Ethereum height
        try {
            this.initHeight = await this.web3.eth.getBlockNumber();
        } catch (_) {
            return err.NO_BLOCK; // Unable to get current Ethereum height
        }

        // Create staking contract instance
        try {
            this.stakeContract = new this.web3.eth.Contract(
                this.stakeABI, this.stakeAddress);
        } catch (_) {
            return err.CONTRACT; // Unable to initialize staking contract
        }

        // Only returns OK upon successful initialization
        this.initialized = true;
        return err.OK;
    }

    /**
     * Starts rebalancer instance after node synchronization, and connects to
     * local Tendermint instance via ABCI.
     * 
     * @returns 0 if OK 
     */
    public start(): number {
        // Subscribe to Ethereum events
        let subCode = this.subscribe();
        if (subCode !== err.OK) { return subCode; }
        
        // Successful startup
        this.started = true;
        return err.OK; 
    }

    /**
     * Use in ABCI commit() to update when a new state is accepted. Updates
     * staking period parameters.
     * 
     * @param round     {number}    accepted new stake round (incrementing)
     * @param startsAt  {number}    accepted starting block for new period
     * @param endsAt    {number}    accepted ending block for new period
     */
    public synchronize(round: number, startsAt: number, endsAt: number): void {
        // Check that new round is the next round
        if (round !== (this.periodNumber + 1)) {
            Logger.rebalancerErr("New round is not one greater than current.");
            Logger.rebalancerErr("Node may be out of state with network.");
        }

        // Update parameters
        this.periodNumber = round;
        this.periodStart = startsAt;
        this.periodEnd = endsAt;
        return;
    }

    /**
     * Used to connect to Web3 provider. Called during initialization, and
     * if a web3 disconnect is detected.
     */
    private connectWeb3(): number {
        let provider: Provider;

        if (typeof(this.web3) !== 'undefined') {
            this.web3 = new Web3(this.web3.currentProvider);
            return err.OK;
        } else {
            let protocol = this.web3provider.protocol;
            let url = this.web3provider.href;

            // Supports HTTP and WS
            try {
                if (protocol === 'ws:' || protocol === 'wss:'){
                    provider = new Web3.providers.WebsocketProvider(url);
                } else if (protocol === 'http:' || protocol === 'https:'){
                    provider = new Web3.providers.HttpProvider(url);
                } else {
                    // Invalid provider URI scheme
                    return err.URI_SCHEME; 
                }
            } catch (_) {
                // Unable to establish provider
                return err.WEB3_PROV;  
            }

            // Create Web3 instance
            try {
                this.web3 = new Web3(provider);
            } catch (_) {
                // Unable to create web3 instance
                return err.WEB3_INST; 
            }
 
            return err.OK; 
        }
    }

    /**
     * Subscribe to relevant Ethereum events and attach handlers.
     */
    private subscribe(): number {
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
        } catch (_) {
            // Unable to subscribe to events
            return err.SUBSCRIBE; 
        }

        // Success
        return err.OK;
    }

    /**
     * Stake event handler. NOTE: events are indexed by the block they occur
     * in, not the finality block for that event.
     * 
     * @param e     {object}    error object
     * @param res   {object}    event response object
     */
    private handleStake = (e: any, res: any) => {
        if (e !== null) {
            Logger.rebalancerErr(msg.rebalancer.errors.badStakeEvent);
            return;
        }

        // Pull event parameters
        let staker = res.returnValues.staker.toLowerCase(); // Staker's address
        let rType = res.event.toLowerCase();                // Raw event type
        let amount = parseInt(res.returnValues.amount);     // Amount staked
        let block = res.blockNumber;                        // Event block

        // Generate event object
        let event = StakeRebalancer.genEvtObject(staker, rType, amount, block);

        // See if this is a historical event that has already matured
        if ((this.initHeight - block) > this.finalityThreshold){
            this.updateBalance(event);
            this.execEventTx(event);
            return;
        }
        
        // If this is the first event from this block, create entry
        if (!this.events.hasOwnProperty(block)) {
            this.events[block] = {};
        }

        // Add event to confirmation queue
        this.events[block][staker] = event;
        return;
    }

    /**
     * New Ethereum block event handler. Updates balances and executes ABCI
     * transactions at appropriate finality blocks.
     * 
     * @param e     {object}    error object
     * @param res   {object}    event response object
     */
    private handleBlock = (e: any, res: any) => {
        if (e !== null) {
            Logger.rebalancerErr(msg.rebalancer.errors.badBlockEvent);
            return;
        }

        // Update current Ethereum block
        this.currHeight = res.number;

        // See if this is the first new block
        if ((this.periodNumber === 0) && (res.number > this.initHeight)) {
            Logger.rebalancer("Proposing parameters for initial period.", 0);
            
            // Prepare proposal tx
            let tx = this.genRebalanceTx(0, res.number, this.periodLength);
            
            // Attempt to submit
            let code = this.execAbciTx(tx);
            if (code !== err.OK) {
                Logger.rebalancerErr(`Tx failed with code: ${code}.`);
            }

            // Exit block handler function early on first block
            return;
        }
        
        // Calculate which block is reaching maturity
        let matBlock = this.currHeight - this.finalityThreshold;
        Logger.rebalancer(`(Temporary) Most final block is: ${matBlock}`, this.periodNumber);
        Logger.rebalancer(`(Temporary) Next round ends at: ${this.periodEnd}`, this.periodNumber);

        // See if any events have reached finality
        if (this.events.hasOwnProperty(matBlock)) {
            Object.keys(this.events[matBlock]).forEach(k => {
                this.updateBalance(this.events[matBlock][k]);
                this.execEventTx(this.events[matBlock][k]);
            });

            // Once all balances have been updated, delete entry
            delete this.events[matBlock];
        }

        // See if the round has ended, and submit rebalance tx if so
        if (matBlock >= this.periodEnd) {
            // Prepare transaction
            let tx = this.genRebalanceTx(
                this.periodNumber, this.currHeight, this.periodLength
            );

            // Execute ABCI transaction
            let code = this.execAbciTx(tx);
            if (code !== err.OK) {
                Logger.rebalancerErr(`Tx failed with code: ${code}`)
            }
        }

        // Return once all tasks complete
        return;
    }

    /**
     * Perform "state transition" of instance balances. NOTE: this function
     * does not modify the state of the ABCI application, however it 
     * implements the same logic as the state machine to ensure balances in
     * state are up-to-date with the instance balances.
     * 
     * @param evt   {object}    event object
     */
    private updateBalance(evt: any): void {
        // If no stake is present, set balance to stake amount
        if (!this.balances.hasOwnProperty(evt.staker)) {
            this.balances[evt.staker] = evt.amount;
            return;
        }

        // Update balance based on stake event 
        switch (evt.type) {
            case 'add': {
                this.balances[evt.staker] += evt.amount;
                break;
            }
            case 'remove': {
                this.balances[evt.staker] -= evt.amount;
                break;
            }
            default: {
                Logger.rebalancerErr("Received unknown event type.");
                return;
            }
        }

        // Remove balance entry if it is now 0
        if (this.balances[evt.staker] === 0) delete this.balances[evt.staker];
        return;
    }

    /**
     * Construct a new event ABCI transaction object.
     * 
     * @param _staker   {string}    Ethereum address string 
     * @param _type     {string}    stake event type ('add' or 'remove')     
     * @param _block    {number}    block height event was mined in 
     * @param _amt      {number}    amount staked or unstaked
     */
    private genEventTx(_staker, _type, _block, _amt): object {
        // Construct and sign transaction object
        let tx = new Transaction("witness", {
            staker: _staker,
            type: _type,
            block: _block,
            amount: _amt
        });

        return tx;
    }

    /**
     * Generates a rebalance transaction object by computing proportional
     * allocation of transaction throughput based on stake size.
     * 
     * @param _round    {number}    the current staking period number 
     * @param _start    {number}    period starting ETG block number
     * @param _length   {number}    the length of each period in ETH blocks
     */
    private genRebalanceTx(_round, _start, _length): object {
        let map: any;

        if (_round === 0) {
            // Submit a blank mapping if this is the first proposal
            map = {};
        } else {
            // Generate a mapping based on balances otherwise
            map = StakeRebalancer.genLimits(this.balances, this.periodLimit);
        }
  
        // Create and sign transaction object
        let tx = new Transaction("rebalance", {
            round: {
                number: _round + 1,
                startsAt: _start,
                endsAt: _start + _length,
                limit: this.periodLimit
            },
            limits: map
        });

        // Return constructed transaction object
        return tx;
    }

    /**
     * Generate and send and event witness transaction.
     * 
     * @param event     {object}    event object
     */
    private execEventTx(event: any): void {
        let tx = this.genEventTx(
            event.staker, event.type, event.block, event.amount
        );

        let code = this.execAbciTx(tx);
        if (code !== 0) {
            Logger.rebalancerErr("Event Tx failed.");
        }
        return;
    }

    /**
     * Encodes and compresses a transactions, then submits it to Tendermint
     * via the broadcaster connection.
     * 
     * @param _tx   {object}    raw transaction object
     */
    private execAbciTx(_tx: any): number {
        try {
            this.broadcaster.send(_tx).then(_ => {
                Logger.rebalancer("Executed local ABCI Tx.", this.periodNumber);
            }).catch(_ => {
                Logger.rebalancerErr("Local ABCI transaction failed.");
            });
        } catch (e) {
            Logger.rebalancerErr("Failed to execute local ABCI transaction.");
            return err.TX_FAILED;
        }

        // Will return OK unless ABCI is disconnected
        return err.OK;
    }
}