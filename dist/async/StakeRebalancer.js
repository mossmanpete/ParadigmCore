"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const url_1 = require("url");
const Web3 = require("web3");
const Codes_1 = require("../util/Codes");
const Logger_1 = require("../util/Logger");
const messages_1 = require("../util/static/messages");
class StakeRebalancer {
    constructor(opts) {
        this.handleStake = (e, res) => {
            if (e !== null) {
                Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.badStakeEvent);
                return;
            }
            const staker = res.returnValues.staker.toLowerCase();
            const rType = res.event.toLowerCase();
            const amount = BigInt.fromString((res.returnValues.amount));
            const block = res.blockNumber;
            const event = StakeRebalancer.genEvtObject(staker, rType, amount, block);
            if ((this.initHeight - block) > this.finalityThreshold) {
                this.updateBalance(event);
                this.execEventTx(event);
                return;
            }
            if (!this.events.hasOwnProperty(block)) {
                this.events[block] = {};
            }
            this.events[block][staker] = event;
            return;
        };
        this.handleBlock = (e, res) => {
            if (e !== null) {
                Logger_1.Logger.rebalancerErr(messages_1.messages.rebalancer.errors.badBlockEvent);
                return;
            }
            this.currHeight = res.number;
            if ((this.periodNumber === 0) && (res.number > this.initHeight)) {
                Logger_1.Logger.rebalancer("Proposing parameters for initial period.", 0);
                const tx = this.genRebalanceTx(0, res.number, this.periodLength);
                const code = this.execAbciTx(tx);
                if (code !== Codes_1.default.OK) {
                    Logger_1.Logger.rebalancerErr(`Tx failed with code: ${code}.`);
                }
                return;
            }
            const matBlock = this.currHeight - this.finalityThreshold;
            Logger_1.Logger.rebalancer(`New mature block: ${matBlock}. Round ends at: ${this.periodEnd}`, this.periodNumber);
            if (this.events.hasOwnProperty(matBlock)) {
                Object.keys(this.events[matBlock]).forEach((k) => {
                    this.updateBalance(this.events[matBlock][k]);
                    this.execEventTx(this.events[matBlock][k]);
                });
                delete this.events[matBlock];
            }
            if (matBlock >= this.periodEnd) {
                const tx = this.genRebalanceTx(this.periodNumber, this.currHeight, this.periodLength);
                const code = this.execAbciTx(tx);
                if (code !== Codes_1.default.OK) {
                    Logger_1.Logger.rebalancerErr(`Tx failed with code: ${code}`);
                }
            }
            return;
        };
        try {
            this.web3provider = new url_1.URL(opts.provider);
        }
        catch (err) {
            throw new Error("Invalid web3 provider URL.");
        }
        this.periodLimit = opts.periodLimit;
        this.periodLength = opts.periodLength;
        this.periodNumber = 0;
        this.broadcaster = opts.broadcaster;
        this.txGenerator = opts.txGenerator;
        this.finalityThreshold = opts.finalityThreshold;
        this.stakeABI = opts.stakeABI;
        this.stakeAddress = opts.stakeAddress;
        this.events = {};
        this.balances = {};
        this.initialized = false;
        this.started = false;
    }
    static async create(options) {
        let instance;
        try {
            instance = new StakeRebalancer(options);
            const code = await instance.initialize();
            if (code !== Codes_1.default.OK) {
                throw new Error(`Rebalancer initialization failed with code: ${code}`);
            }
        }
        catch (err) {
            throw new Error(err.message);
        }
        return instance;
    }
    static genLimits(bals, limit) {
        let total = BigInt(0);
        const output = {};
        Object.keys(bals).forEach((k, v) => {
            if (bals.hasOwnProperty(k) && _.isEqual(typeof (bals[k]), "bigint")) {
                total += bals[k];
            }
        });
        Object.keys(bals).forEach((k, v) => {
            if (bals.hasOwnProperty(k) && _.isEqual(typeof (bals[k]), "bigint")) {
                const pLimit = (bals[k].toNumber() / total.toNumber());
                output[k] = {
                    orderLimit: Math.floor(pLimit * limit),
                    streamLimit: 1,
                };
            }
        });
        return output;
    }
    static genEvtObject(staker, rType, amount, block) {
        let type;
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
        return { staker, type, amount, block };
    }
    async initialize() {
        if (this.initialized && this.initHeight !== undefined) {
            return Codes_1.default.OK;
        }
        const code = this.connectWeb3();
        if (code !== Codes_1.default.OK) {
            return code;
        }
        try {
            this.initHeight = await this.web3.eth.getBlockNumber();
        }
        catch (_) {
            return Codes_1.default.NO_BLOCK;
        }
        try {
            this.stakeContract = new this.web3.eth.Contract(this.stakeABI, this.stakeAddress);
        }
        catch (_) {
            return Codes_1.default.CONTRACT;
        }
        this.initialized = true;
        return Codes_1.default.OK;
    }
    start() {
        const subCode = this.subscribe();
        if (subCode !== Codes_1.default.OK) {
            return subCode;
        }
        this.started = true;
        return Codes_1.default.OK;
    }
    synchronize(round, startsAt, endsAt) {
        if (round !== (this.periodNumber + 1)) {
            Logger_1.Logger.rebalancerErr("New round is not one greater than current.");
            Logger_1.Logger.rebalancerErr("Node may be out of state with network.");
        }
        this.periodNumber = round;
        this.periodStart = startsAt;
        this.periodEnd = endsAt;
        return;
    }
    getProvider() {
        let provider;
        const protocol = this.web3provider.protocol;
        const url = this.web3provider.href;
        try {
            if (protocol === "ws:" || protocol === "wss:") {
                provider = new Web3.providers.WebsocketProvider(url);
            }
            else if (protocol === "http:" || protocol === "https:") {
                provider = new Web3.providers.HttpProvider(url);
            }
            else {
                throw new Error("Invalid provider URI.");
            }
        }
        catch (_) {
            throw new Error("Unable to connect to provider.");
        }
        provider.on("connect", () => {
            Logger_1.Logger.rebalancer("Successfully connected to web3 provider.");
        });
        provider.on("end", () => {
            Logger_1.Logger.rebalancerErr("Web3 connection end. Attempting to reconnect...");
            try {
                this.web3.setProvider(this.getProvider());
            }
            catch (error) {
                Logger_1.Logger.rebalancerErr("Failed reconnecting to web3 provider.");
            }
        });
        provider.on("end", () => {
            Logger_1.Logger.rebalancerErr("Web3 error. Attempting to reconnect...");
            try {
                this.web3.setProvider(this.getProvider());
            }
            catch (error) {
                Logger_1.Logger.rebalancerErr("Failed reconnecting to web3 provider.");
            }
        });
        return provider;
    }
    connectWeb3() {
        if (typeof (this.web3) !== "undefined") {
            this.web3 = new Web3(this.web3.currentProvider);
            return Codes_1.default.OK;
        }
        else {
            try {
                this.web3 = new Web3(this.getProvider());
            }
            catch (error) {
                return Codes_1.default.WEB3_INST;
            }
            return Codes_1.default.OK;
        }
    }
    subscribe(from = 0) {
        try {
            this.stakeContract.events.StakeMade({
                fromBlock: from,
            }, this.handleStake);
            this.stakeContract.events.StakeRemoved({
                fromBlock: from,
            }, this.handleStake);
            this.web3.eth.subscribe("newBlockHeaders", this.handleBlock);
        }
        catch (_) {
            return Codes_1.default.SUBSCRIBE;
        }
        return Codes_1.default.OK;
    }
    updateBalance(evt) {
        if (!this.balances.hasOwnProperty(evt.staker)) {
            this.balances[evt.staker] = evt.amount;
            return;
        }
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
                Logger_1.Logger.rebalancerErr("Received unknown event type.");
                return;
            }
        }
        if (this.balances[evt.staker] === 0) {
            delete this.balances[evt.staker];
        }
        return;
    }
    genRebalanceTx(round, start, length) {
        let map;
        if (round === 0) {
            map = {};
        }
        else {
            map = StakeRebalancer.genLimits(this.balances, this.periodLimit);
        }
        const tx = this.txGenerator.create({
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
        return tx;
    }
    execEventTx(event) {
        const tx = this.txGenerator.create({
            data: {
                amount: event.amount,
                block: event.block,
                staker: event.staker,
                type: event.type,
            },
            type: "witness",
        });
        const code = this.execAbciTx(tx);
        if (code !== 0) {
            Logger_1.Logger.rebalancerErr("Event Tx failed.");
        }
        return;
    }
    execAbciTx(tx) {
        try {
            this.broadcaster.send(tx).then((response) => {
                Logger_1.Logger.rebalancer("Executed local ABCI Tx.", this.periodNumber);
            }).catch((error) => {
                Logger_1.Logger.rebalancerErr("Local ABCI transaction failed.");
            });
        }
        catch (error) {
            Logger_1.Logger.rebalancerErr("Failed to execute local ABCI transaction.");
            return Codes_1.default.TX_FAILED;
        }
        return Codes_1.default.OK;
    }
}
exports.StakeRebalancer = StakeRebalancer;
