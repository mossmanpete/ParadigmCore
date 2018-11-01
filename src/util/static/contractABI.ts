/*
  =========================
  ParadigmCore: Blind Star
  contractABI.ts @ {master}
  =========================

  @date_initial 12 September 2018
  @date_modified 1 November 2018
  @author Henry Harder

  Staking contract ABI.
*/

export const STAKE_CONTRACT_ABI: Array<object> = [{"constant":true,"inputs":[{"name":"a","type":"address"}],"name":"stakeFor","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalStaked","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"removeStake","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"stake","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"digm","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"staker","type":"address"},{"name":"amount","type":"uint256"}],"name":"stakeFromTokenContract","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_digm","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"staker","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"StakeMade","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"staker","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"StakeRemoved","type":"event"}];