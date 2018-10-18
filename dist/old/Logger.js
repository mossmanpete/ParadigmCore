"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  Logger.ts @ {rebalance-refactor}
  =========================

  @date_inital 25 September 2018
  @date_modified 16 October 2018
  @author Henry Harder

  Simple Logger class to handle logs to STDOUT.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const Timestamp_1 = require("./Timestamp");
require("colors");
class Logger {
    static logStart() {
        console.log(`${'S'.magenta} [${"PC".cyan} v${config_1.VERSION.bold} @ ${new Timestamp_1.Timestamp().logFormat().yellow}] Starting ${'ParadigmCore (ALPHA)'.cyan.bold} version ${config_1.VERSION.red}`);
    }
    static logEvent(message) {
        console.log(`${'I'.green} [${"PC".cyan} v${config_1.VERSION.bold} @ ${new Timestamp_1.Timestamp().logFormat().yellow}] ${message}`);
    }
    static logError(message) {
        console.log(`${'E'.red} [${"PC".cyan} v${config_1.VERSION.bold} @ ${new Timestamp_1.Timestamp().logFormat().yellow}] ${message.red}`);
    }
    static newRound(height, proposer) {
        Logger.logEvent(`${`Starting block #${height}:`.blue} Validator ${proposer.bold} is proposer.`);
    }
    static mempool(message) {
        Logger.logEvent(`${'Mempool:'.magenta.bold} ${message}`);
    }
    static mempoolErr(message) {
        Logger.logError(`${'Mempool'.magenta.bold} ${'Error:'.red} ${message}`);
    }
    static consensus(message) {
        Logger.logEvent(`${'Consensus:'.cyan} ${message}`);
    }
    static consensusErr(message) {
        Logger.logError(`${'Consensus'.cyan} ${'Error:'.red} ${message}`);
    }
    static rebalancer(message) {
        Logger.logEvent(`${'Rebalancer:'.green} ${message}`);
    }
    static rebalancerErr(message) {
        Logger.logError(`${'Rebalancer'.green} ${'Error:'.red} ${message}`);
    }
    static websocketEvt(message) {
        Logger.logEvent(`${'WebSocket:'.red} ${message}`);
    }
    static websocketErr(message) {
        Logger.logError(`${'WebSocket'.red} ${'Error:'.red} ${message}`);
    }
    static apiEvt(message) {
        Logger.logEvent(`${'API Server:'.yellow} ${message}`);
    }
    static apiErr(message) {
        Logger.logError(`${'API Server'.yellow} ${'Error:'.red} ${message}`);
    }
}
exports.Logger = Logger;
