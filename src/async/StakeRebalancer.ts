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

import Web3 = require('web3');
import Contract from "web3/eth/contract";
import { URL } from "url";
import { RpcClient } from "tendermint";

import { Logger } from "../util/Logger";
import { messages as msg } from "../util/messages";
import { default as err } from "../util/Codes";
import { Provider } from "web3/providers";
import { PayloadCipher } from '../crypto/PayloadCipher';

export class StakeRebalancer {
    // Rebalancer instance status
    private initialized: boolean;   // True if .initialize() sucessful
    private started: boolean;       // True if Tendermint in sync

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

    // Tendermint ABCI connection variables
    private abciClient: RpcClient;  // Tendermint ABCI client
    private abciURI: URL;           // Local ABCI application URI

    // Event, balance and limit mappings (out-of-state)
    private events: any;        // Events pending maturity threshold
    private balances: any;      // The address:stake_amount mapping
    
    /**
     * @name genLimits()
     * @description Generates an output address:limit mapping based on a provided
     * address:balance mapping, and a total thoughput limit.
     * 
     * @param balances  {object} current address:balance mapping
     * @param limit     {number} total number of orders accepted per period
     */
    public static genLimits(balances: any, limit: number): any {
        let total: number; // total amount currenty staked
        let stakers: number; // total number of stakers

        let output: object = {}; // generated output mapping

        // Calculate total balance currently staked
        Object.keys(balances).forEach((k, _) => {
            if (balances.hasOwnProperty(k) && typeof(balances[k]) === 'number') {
                total += balances[k];
                stakers += 1;
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

        // return [output, stakers]; //  do this?
        return output;
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
    public static async create(options: any): Promise<StakeRebalancer> {
        let instance; // stores new StakeRebalancer instance

        try {
            instance = new StakeRebalancer(options);
            let code = await instance.initialize();
            if (code !== err.OK) {
                throw new Error(`ERRCODE: ${code}`)
            }
        } catch (err) {
            throw new Error(err.message);
        }

        return instance;
    }
    
    /**
     * @name constructor()
     * @private
     * @description PRIVATE constructor. Do not use. Create new rebalancers
     * with StakeRebalancer.create(options)
     * 
     * @param options {object} see .create()
     */
    private constructor(options: any) {
        try {
            this.web3provider = new URL(options.provider);
        } catch (err) {
            throw new Error("Invalid web3 provider URL.");
        }

        // Staking period parameters
        this.periodLimit = options.periodLimit;
        this.periodLength = options.periodLength;
        this.periodNumber = 0;

        // Finality threshold
        this.finalityThreshold = options.finalityThreshold;

        // Staking contract parameters
        this.stakeABI = options.stakeABI;
        this.stakeAddress = options.stakeAddress;

        // Tendermint client parameters
        this.abciURI = new URL(`ws://${options.abciHost}:${options.abciPort}`);

        // Mapping objects
        this.events = {};
        this.balances = {};

        // Set rebalancer instance status
        this.initialized = false;
        this.started = false;
    }

    /**
     * @name initialize()
     * @description Initialize rebalancer instance by connecting to a web3
     * endpoint and instantiating contract instance. Uses error codes.
     * 
     * @returns (a promise that resolves to) 0 if OK
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

        // Only returns 0 upon successful initialization

        console.log(this.initHeight); // temporary

        this.initialized = true;
        return err.OK;
    }

    /**
     * @name start()
     * @description Starts rebalancer instance after node synchronization,
     * and connects to local Tendermint instance via ABCI.
     * 
     * @returns 0 if OK 
     */
    public start(): number {
        // Subscribe to Ethereum events
        let subc = this.subscribe();
        if (subc !== err.OK) { return subc; }
        
        // Connect to Tendermint via ABCI
        let abcic = this.connectABCI();
        if (abcic !== err.OK) { return abcic; }

        // Success
        this.started = true;
        return err.OK; 
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
     * @name connectWeb3()
     * @description Used to connect to Web3 provider. Called upon 
     * initialization, and if a web3 disconnect is detected.
     */
    private connectWeb3(): number {
        let provider: Provider;

        if (typeof(this.web3) !== 'undefined') {
            this.web3 = new Web3(this.web3.currentProvider);
            return err.OK; // Sucessful
        } else {
            let protocol = this.web3provider.protocol;
            let url = this.web3provider.href;

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

            try {
                this.web3 = new Web3(provider);
            } catch (_) {
                // Unable to create web3 instance
                return err.WEB3_INST; 
            }

            // Sucessful 
            return err.OK; 
        }
    }

    /**
     * @name connectABCI()
     * @description Connect to local Tendermint ABCI server.
     */
    private connectABCI(): number {
        try {
            if (this.abciClient === undefined) {
                this.abciClient = RpcClient(this.abciURI.href);
                this.abciClient.on('close', () => {
                    console.log('(temp) client disconnected.');
                });
                this.abciClient.on('error', () => {
                    console.log('(temp) error in abci client');
                });

                Logger.rebalancer(
                    "Connected to Tendermint via ABCI", this.periodNumber);
                }
        } catch (err) {
            return err.ABCI_CON; // Unable to establish ABCI connection
        }

        return err.OK;
    }

    /**
     * @name subscribe()
     * @description Subscribe to relevant Ethereum events and attach handlers.
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
     * @name handleStake()
     * @description Stake event handler. NOTE: events are indexed by the block
     * they occur in, not the finality block for that event.
     * 
     * @param e     {object}    error object
     * @param res   {object}    event response object
     */
    private handleStake = (e: any, res: any) => {
        if (e !== null) {
            Logger.rebalancerErr(msg.rebalancer.errors.badStakeEvent);
            return;
        }

        // Create event object
        let block = res.blockNumber;
        console.log(`in handle stake: block: ${block}`);
        let eventObject = {
            "type": res.event.toLowerCase(),
            "staker": res.returnValues.staker.toLowerCase(),
            "amount": parseInt(res.returnValues.amount),
            "block": block
        };

        // work on this

        /*
        // See if this is a historical block that has already matured
        if ((this.initHeight - block) > this.finalityThreshold){
            this.updateBalance(eventObject);
            this.execEventTx(eventObject);
            return;
        }*/
        
        // If this is the first event from this block, create entry
        if (!this.events.hasOwnProperty(block)) {
            this.events[block] = [];
        }

        // Add event to confirmation queue
        this.events[block].push(eventObject);

        console.log(`(temp) got new stake`)
        console.log(`(rebalancer) ${JSON.stringify(this.events)}`);
        return;
    }

    /**
     * @name handleBlock()
     * @description New Ethereum block event handler. Updates balances and
     * executes ABCI transactions at appropriate finality blocks.
     * 
     * @param e     {object}    error object
     * @param res   {object}    event response object
     */
    private handleBlock = (e: any, res: any) => {
        if (e !== null) {
            Logger.rebalancerErr(msg.rebalancer.errors.badBlockEvent);
            return;
        }

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

    private updateBalance(event: any): void {
        // If no stake is present, set balance to stake amount
        if (!this.balances.hasOwnProperty(event.staker)) {
            this.balances[event.staker] = event.amount;
            console.log('making new bal');
            return;
        }

        switch (event.type) {
            case 'stakemade': {
                this.balances[event.staker] += event.amount;
                console.log('adding to bal');
                return;
            }

            case 'stakeremoved': {
                this.balances[event.staker] -= event.amount;
                console.log('removing from bal');
                return;
            }

            default: {
                Logger.rebalancerErr("Received unknown event type.");
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
    private genEventTx(_staker, _type, _block, _amt): object {
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
    private genRebalanceTx(_round, _start, _length): object {
        let map: any;

        if (_round === 0) {
            // Submit a blank mapping if this is the first proposal
            map = {};
        } else {
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

        return tx;
    }

    /**
     * @name execEventTx()
     * @description Generate and send and event witness transaction.
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
     * @name execAbciTx()
     * @description Encodes and compresses a transactions, then submits it to
     * Tendermint via the local ABCI server.
     * 
     * @param _tx   {object}    raw transaction object
     */
    private execAbciTx(_tx: any): number {
        // todo add queue?
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

        // Will return OK unless ABCI is disconnected
        return err.OK;
    }
}