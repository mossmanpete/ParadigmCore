let Web3 = require("web3");
import Contract from "web3/eth/contract";
import { URL } from "url";
import { RpcClient } from "tendermint";

import { Logger } from "../util/Logger";
import { messages as msg } from "../util/messages";

export class StakeRebalancer {
    // Rebalancer instance status
    private initialized: boolean;   // True if .initialize() sucessful
    private started: boolean;       // True if Tendermint in sync

    // Web3 instance variables
    private web3provider: URL;  // Web3 provider URI
    private web3: any;          // Web3 instance
    private initHeight: number; // Ethereum height upon initialization

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
    
    /**
     * @name generateLimits()
     * @description Generates an output address:limit mapping based on a provided
     * address:balance mapping, and a total thoughput limit.
     * 
     * @param balances  {object} current address:balance mapping
     * @param limit     {number} total number of orders accepted per period
     */
    public static generateLimits(balances: any, limit: number): any {
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

        // return [output, stakers];
        return output;
    }

    public static generateEventTx(_staker, _type, _block, _amount): object {
        let tx = {
            type: "StakeEvent",
            data: {
                staker: _staker,
                type: _type,
                block: _block,
                amount: _amount
            }        
        };
        return tx;
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
    public static async create(options: any): Promise<StakeRebalancer> {
        let instance; // stores new StakeRebalancer instance

        try {
            instance = new StakeRebalancer(options);
            let code = await instance.initialize();
            if (code !== 0) {
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

        // Staking contract parameters
        this.stakeABI = options.stakeABI;
        this.stakeAddress = options.stakeAddress;

        // Tendermint client parameters
        this.abciURI = new URL(`ws://${options.abciHost}:${options.abciPort}`);

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
        if (this.initialized) {
            return 5; // Already initialized
        }

        let provider: any; // Web3 provider instance

        // Establish web3 connection
        if (typeof(this.web3) !== 'undefined') {
            this.web3 = new Web3(this.web3.currentProvider);
        } else {
            let protocol = this.web3provider.protocol;
            let url = this.web3provider.href;

            if (protocol === 'ws:' || protocol === 'wss:'){
                provider = new Web3.providers.WebsocketProvider(url);
            } else if (protocol === 'http:' || protocol === 'https:'){
                provider = new Web3.providers.HttpProvider(url);
            } else {
                return 1; // Invalid provider URI scheme
            }

            try {
                this.web3 = new Web3(provider);
            } catch (_) {
                return 2; // Unable to connect to web3 provider
            }
        }

        // Get current Ethereum height
        try {
            this.initHeight = await this.web3.eth.getBlockNumber();
        } catch (_) {
            return 3; // Unable to get current Ethereum height
        }

        // Create staking contract instance
        try {
            this.stakeContract = new this.web3.eth.Contract(
                this.stakeABI, this.stakeAddress);
        } catch (_) {
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
    public start(): number {
        // Subscribe to Ethereum events
        let code = this.subscribe();

        // Immediate failure
        if (code !== 0) { return 1; } 

        // Connect to local Tendermint instance
        // TODO: move to function
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
            return 2; // Unable to establish ABCI connection
        }

        // Success
        this.started = true;
        return 0; 
    }

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
            return 1; // Unable to subscribe to events
        }

        return 0;
    }

    public synchronize(a, b, c){
        console.log('syncing');
    }

    private handleStake = (err, res) => {
        if (err !== null) {
            Logger.rebalancerErr(msg.rebalancer.errors.badStakeEvent);
            return;
        }

        let eventType = res.event.toLowerCase();
        let staker = res.returnValues.staker.toLowerCase();
        let amount = parseInt(res.returnValues.amount);
        let block = parseInt(res.blockNumber);

        switch (eventType) {
            case 'stakemade': {
                break;
            }
            case 'stakeremoved': {
                break;
            }
            default: {
                Logger.rebalancerErr("Unknown Ethereum event type.");
                return;
            }
        }
        return;
    }

    private handleBlock = (err, res) => {
        console.log('skipping block event');
        return;
    }
}

