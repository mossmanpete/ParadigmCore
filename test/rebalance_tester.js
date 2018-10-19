"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StakeRebalancer_1 = require("../dist/StakeRebalancer");
const config_1 = require("../dist/config");

let rebalancer;

async function start(){
    rebalancer = await StakeRebalancer_1.StakeRebalancer.create({
        provider: config_1.WEB3_PROVIDER,
        periodLength: config_1.STAKE_PERIOD,
        periodLimit: config_1.PERIOD_LIMIT,
        stakeContractAddr: config_1.STAKE_CONTRACT_ADDR,
        stakeContractABI: config_1.STAKE_CONTRACT_ABI
    });
}

start();

