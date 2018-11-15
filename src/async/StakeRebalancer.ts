/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name StakeRebalancer.ts
 * @module src/async
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  15-October-2018
 * @date (modified) 13-November-2018
 *
 * The StakeRebalancer class implements a one-way (read only) peg to Ethereum,
 * and adds a "finality gadget" via a block maturity requirement for events
 * before they can modify the OrderStream's state.
 *
 * See the spec doc in `/spec/ethereum-peg.md` for more information.
 */

// Third party and stdlib imports
import * as _ from "lodash";
import { URL } from "url";
import Web3 = require("web3");
import Contract from "web3/eth/contract";
import { HttpProvider, WebsocketProvider } from "web3/providers";

// ParadigmCore modules/classes
import { TxGenerator } from "src/abci/util/TxGenerator";
import { TxBroadcaster } from "../abci/util/TxBroadcaster";
import { default as err } from "../util/Codes";
import { Logger as Log } from "../util/Logger";
import { messages as msg } from "../util/static/messages";

export class StakeRebalancer {

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
     *  - options.txGenerator       {TxGenerator}      tx generator/signer
     */
    public static async create(options: any): Promise<StakeRebalancer> {
        let instance;   // Stores new StakeRebalancer instance

        try {
            // Create new rebalancer instance
            instance = new StakeRebalancer(options);

            // Initialize instance (and store response code)
            const code = await instance.initialize();

            // Reject promise if initialization failed
            if (code !== err.OK) {
                throw new Error(`Rebalancer initialization failed with code: ${code}`);
            }
        } catch (err) {
            // Throw error with message and code from above
            throw new Error(err.message);
        }

        // Return new instance upon successful initialization
        return instance;
    }

    /**
     * Generates an output address:limit mapping based on a provided
     * address:balance mapping, and a total throughput limit.
     *
     * @param bals      {object} current address:balance mapping
     * @param limit     {number} total number of orders accepted per period
     */
    public static genLimits(bals: Balances, limit: number): Limits {
        let total: any = BigInt(0);  // Total amount currently staked
        const output: Limits = {};      // Generated output mapping

        // Calculate total balance currently staked
        Object.keys(bals).forEach((k, v) => {
            if (bals.hasOwnProperty(k) && _.isEqual(typeof(bals[k]), "bigint")) {
                total += bals[k];
            }
        });

        // Compute the rate-limits for each staker based on stake size
        Object.keys(bals).forEach((k, v) => {
            if (bals.hasOwnProperty(k) && _.isEqual(typeof(bals[k]), "bigint")) {
                const pLimit: number = (bals[k].toNumber() /  total.toNumber());

                // Create limit object for each address
                output[k] = {
                    // orderLimit is proportional to stake size
                    orderLimit: Math.floor(pLimit * limit),

                    // streamLimit is always 1, regardless of stake size
                    streamLimit: 1,
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
     * @param rType     {string}    stake type (`stakemade` or `stakeremoved`)
     * @param amount    {BigInt}    amount staked in event
     * @param block     {number}    Ethereum block the event was recorded in.
     */
    public static genEvtObject(
        staker: string,
        rType: string,
        amount: BigInt,
        block: number
    ): RawStakeEvent {
        let type: string; // Parsed event type

        // Detect event type
        switch (rType) {
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
        return { staker, type, amount, block };
    }

    /* End static methods. */

    /* Instance methods and variables below. */

    // Rebalancer instance status
    private initialized: boolean;   // True if .initialize() successful
    private started: boolean;       // True if Tendermint is connected

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
    private stakeABI: object[];         // Staking contract ABI
    private stakeAddress: string;       // Staking contract address

    // Tendermint ABCI utility classes
    private broadcaster: TxBroadcaster;   // ABCI Tx broadcaster and queue
    private txGenerator: TxGenerator;  // Builds and signs transactions

    // Event, balance and limit mappings (out-of-state)
    private events: any;        // Events pending maturity threshold
    private balances: Balances;      // The address:stake_amount mapping

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

        // Local ABCI transaction broadcaster and generator
        this.broadcaster = opts.broadcaster;
        this.txGenerator = opts.txGenerator;

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
        const code = this.connectWeb3();
        if (code !== err.OK) { return code; }

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

        // Only returns OK (0) upon successful initialization
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
        const subCode = this.subscribe();
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
            Log.rebalancerErr("New round is not one greater than current.");
            Log.rebalancerErr("Node may be out of state with network.");
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
    private getProvider(): WebsocketProvider | HttpProvider {
        let provider: WebsocketProvider | HttpProvider;

        // Pull provider URL and protocol from instance
        const protocol = this.web3provider.protocol;
        const url = this.web3provider.href;

        // Supports HTTP and WS
        try {
            if (protocol === "ws:" || protocol === "wss:") {
                provider = new Web3.providers.WebsocketProvider(url);
            } else if (protocol === "http:" || protocol === "https:") {
                provider = new Web3.providers.HttpProvider(url);
            } else {
                // Invalid provider URI scheme
                throw new Error("Invalid provider URI.");
            }
        } catch (_) {
            // Unable to establish provider
            throw new Error("Unable to connect to provider.");
        }

        // Log connection message
        provider.on("connect", () => {
            Log.rebalancer("Successfully connected to web3 provider.");
        });

        // Attempt to reconnect on termination
        provider.on("end", () => {
            Log.rebalancerErr("Web3 connection end. Attempting to reconnect...");
            try {
                this.web3.setProvider(this.getProvider());
            } catch (error) {
                Log.rebalancerErr("Failed reconnecting to web3 provider.");
            }
        });

        // Attempt to reconnect on any error
        provider.on("end", () => {
            Log.rebalancerErr("Web3 error. Attempting to reconnect...");
            try {
                this.web3.setProvider(this.getProvider());
            } catch (error) {
                Log.rebalancerErr("Failed reconnecting to web3 provider.");
            }
        });

        return provider;
    }

    /**
     * Used to create web3 instance (based on provider generated in
     * `this.getProvider()` method).
     */
    private connectWeb3(): number {
        if (typeof(this.web3) !== "undefined") {
            // If already connected to web3 instance
            this.web3 = new Web3(this.web3.currentProvider);
            return err.OK;
        } else {
            // Create new Web3 instance
            try {
                this.web3 = new Web3(this.getProvider());
            } catch (error) {
                return err.WEB3_INST; // Unable to create web3 instance
            }
            return err.OK;
        }
    }

    /**
     * Subscribe to relevant Ethereum events and attach handlers.
     *
     * @param from  {number}    the block from which to subscribe to events
     */
    private subscribe(from: number = 0): number {
        try {
            // Subscribe to 'stakeMade' events
            this.stakeContract.events.StakeMade({
                fromBlock: from,
            }, this.handleStake);

            // Subscribe to 'stakeRemoved' events
            this.stakeContract.events.StakeRemoved({
                fromBlock: from,
            }, this.handleStake);

            // Subscribe to new blocks
            this.web3.eth.subscribe("newBlockHeaders", this.handleBlock);
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
            Log.rebalancerErr(msg.rebalancer.errors.badStakeEvent);
            return;
        }

        // Pull event parameters
        const staker = res.returnValues.staker.toLowerCase();
        const rType = res.event.toLowerCase();
        const amount = BigInt.fromString((res.returnValues.amount));
        const block = res.blockNumber;

        // Generate event object
        const event = StakeRebalancer.genEvtObject(staker, rType, amount, block);

        // See if this is a historical event that has already matured
        // @TODO: should be this.currentHeight?
        if ((this.initHeight - block) > this.finalityThreshold) {
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
            Log.rebalancerErr(msg.rebalancer.errors.badBlockEvent);
            return;
        }

        // Update current Ethereum block
        this.currHeight = res.number;

        // See if this is the first new block
        if ((this.periodNumber === 0) && (res.number > this.initHeight)) {
            Log.rebalancer("Proposing parameters for initial period.", 0);

            // Prepare proposal tx
            const tx = this.genRebalanceTx(0, res.number, this.periodLength);

            // Attempt to submit
            const code = this.execAbciTx(tx);
            if (code !== err.OK) {
                Log.rebalancerErr(`Tx failed with code: ${code}.`);
            }

            // Exit block handler function early on first block
            return;
        }

        // Calculate which block is reaching maturity
        const matBlock = this.currHeight - this.finalityThreshold;
        Log.rebalancer(
            `New mature block: ${matBlock}. Round ends at: ${this.periodEnd}`,
            this.periodNumber,
        );

        // See if any events have reached finality
        if (this.events.hasOwnProperty(matBlock)) {
            Object.keys(this.events[matBlock]).forEach((k) => {
                this.updateBalance(this.events[matBlock][k]);
                this.execEventTx(this.events[matBlock][k]);
            });

            // Once all balances have been updated, delete entry
            delete this.events[matBlock];
        }

        // See if the round has ended, and submit rebalance tx if so
        if (matBlock >= this.periodEnd) {
            // Prepare transaction
            const tx = this.genRebalanceTx(
                this.periodNumber, this.currHeight, this.periodLength,
            );

            // Execute ABCI transaction
            const code = this.execAbciTx(tx);
            if (code !== err.OK) {
                Log.rebalancerErr(`Tx failed with code: ${code}`);
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
     * @param evt   {StakeEvent}    event object
     */
    private updateBalance(evt: any): void {
        // If no stake is present, set balance to stake amount
        if (!this.balances.hasOwnProperty(evt.staker)) {
            this.balances[evt.staker] = evt.amount;
            return;
        }

        // Update balance based on stake event
        switch (evt.type) {
            case "add": {
                this.balances[evt.staker] += evt.amount;
                break;
            }
            case "remove": {
                this.balances[evt.staker] -= evt.amount;
                break;
            }
            default: {
                Log.rebalancerErr("Received unknown event type.");
                return;
            }
        }

        // Remove balance entry if it is now 0
        if (this.balances[evt.staker] === 0) {
            delete this.balances[evt.staker];
        }
        return;
    }

    /**
     * Generates a rebalance transaction object by computing proportional
     * allocation of transaction throughput based on stake size.
     *
     * @param _round    {number}    the current staking period number
     * @param _start    {number}    period starting ETG block number
     * @param _length   {number}    the length of each period in ETH blocks
     */
    private genRebalanceTx(round, start, length): SignedTransaction {
        let map: any;

        if (round === 0) {
            // Submit a blank mapping if this is the first proposal
            map = {};
        } else {
            // Generate a mapping based on balances otherwise
            map = StakeRebalancer.genLimits(this.balances, this.periodLimit);
        }

        // Create and sign transaction object
        const tx: SignedTransaction = this.txGenerator.create({
            data: {
                limits: map,
                round: {
                    endsAt: start + length,
                    limit: this.periodLimit,
                    number: round + 1,
                    startsAt: start - 1,
                },
            },
            type: "rebalance",
        });

        // Return constructed transaction object
        return tx;
    }

    /**
     * Generate and send and event witness transaction.
     *
     * @param event     {object}    event object
     */
    private execEventTx(event: RawStakeEvent): void {
        // Create and sign transaction object
        const tx = this.txGenerator.create({
            data: {
                amount: event.amount,
                block: event.block,
                staker: event.staker,
                type: event.type,
            },
            type: "witness",
        });

        // Execute local ABCI transaction
        const code = this.execAbciTx(tx);
        if (code !== 0) {
            Log.rebalancerErr("Event Tx failed.");
        }
        return;
    }

    /**
     * Encodes and compresses a transactions, then submits it to Tendermint
     * via the broadcaster connection.
     *
     * @param _tx   {object}    raw transaction object
     */
    private execAbciTx(tx: SignedTransaction): number {
        try {
            this.broadcaster.send(tx).then((response) => {
                Log.rebalancer("Executed local ABCI Tx.", this.periodNumber);
            }).catch((error) => {
                Log.rebalancerErr("Local ABCI transaction failed.");
            });
        } catch (error) {
            Log.rebalancerErr("Failed to execute local ABCI transaction.");
            return err.TX_FAILED;
        }

        // Will return OK unless ABCI is disconnected
        return err.OK;
    }
}
