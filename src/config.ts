import { List } from "underscore";

/*
  =========================
  ParadigmCore: Blind Star
  config.ts @ {master}
  =========================

  @date_inital 12 September 2018
  @date_modified 9 October 2018
  @author Henry Harder

  Constants and configuration.
*/

// major, minor, and sub version numbers
export const VERSION: string = "0.0.3"; // PC Version 

// configuration for Ethereum peg and rebalancer
export const WEB3_PROVIDER: string = "wss://kovan.infura.io/ws";
export const PERIOD_LENGTH: number = 5; // in Ethereum blocks
export const PERIOD_LIMIT: number = 75000; // transactions allowed per period
export const STAKE_CONTRACT_ADDR: string = "0xC42E6EBAF1513e56d55c568ff2a9304aCA2BfD59";
export const STAKE_CONTRACT_ABI: Array<object> = [{"constant":true,"inputs":[{"name":"a","type":"address"}],"name":"stakeFor","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalStaked","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"removeStake","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"stake","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"digm","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_digm","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"staker","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"StakeMade","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"staker","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"StakeRemoved","type":"event"}];

// endpoints for ABCI/RPC
export const ABCI_HOST: string = "localhost";
export const ABCI_RPC_PORT: number = 26657;

// public/private ports for ABCI, RPC, and WS servers
export const ABCI_PORT: number = 26658;
export const API_PORT: number = 4243;
export const WS_PORT: number = 4242;

// encoding types for order server-side transport 
export const IN_ENC: string = "utf8"
export const OUT_ENC: string = "base64"

// Transaction broadcast mode: async, sync, or commit
export const TX_MODE: string = 'sync';