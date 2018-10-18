"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  config.ts @ {rebalance-refactor}
  =========================

  @date_inital 12 September 2018
  @date_modified 16 October 2018
  @author Henry Harder

  Constants and configuration.
*/
Object.defineProperty(exports, "__esModule", { value: true });
// major, minor, and sub version numbers
exports.VERSION = "0.0.3"; // PC Version 
// configuration for Ethereum peg and rebalancer
exports.WEB3_PROVIDER = "wss://kovan.infura.io/ws";
exports.PERIOD_LENGTH = 5; // in Ethereum blocks
exports.PERIOD_LIMIT = 75000; // transactions allowed per period
exports.STAKE_CONTRACT_ADDR = "0xC42E6EBAF1513e56d55c568ff2a9304aCA2BfD59";
exports.STAKE_CONTRACT_ABI = [{ "constant": true, "inputs": [{ "name": "a", "type": "address" }], "name": "stakeFor", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "totalStaked", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "amount", "type": "uint256" }], "name": "removeStake", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "name": "amount", "type": "uint256" }], "name": "stake", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "digm", "outputs": [{ "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "inputs": [{ "name": "_digm", "type": "address" }], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "staker", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }], "name": "StakeMade", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "staker", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }], "name": "StakeRemoved", "type": "event" }];
// endpoints for ABCI/RPC
exports.ABCI_HOST = "localhost";
exports.ABCI_RPC_PORT = 26657;
exports.TM_HOME = `${process.env.HOME}/.tendermint`;
// public/private ports for ABCI, RPC, and WS servers
exports.ABCI_PORT = 26658;
exports.API_PORT = 4243;
exports.WS_PORT = 4242;
// encoding types for order server-side transport 
exports.IN_ENC = "utf8";
exports.OUT_ENC = "base64";
// Transaction broadcast mode: async, sync, or commit
exports.TX_MODE = 'sync';
