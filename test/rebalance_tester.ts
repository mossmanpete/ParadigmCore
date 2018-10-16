import { StakeRebalancer } from "../dist/StakeRebalancer";
import { WEB3_PROVIDER, STAKE_PERIOD, STAKE_CONTRACT_ABI, STAKE_CONTRACT_ADDR } from "../dist/config";

let rebalancer = new StakeRebalancer({
    provider: WEB3_PROVIDER,
    periodLength: STAKE_PERIOD,
    stakeContractAddr: STAKE_CONTRACT_ADDR,
    stakeContractABI: STAKE_CONTRACT_ABI
});

console.log(rebalancer.ethereumHeight);