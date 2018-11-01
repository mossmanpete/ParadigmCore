"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  Logger.ts @ {master}
  =========================

  @date_initial 25 September 2018
  @date_modified 19 October 2018
  @author Henry Harder

  Simple Logger class to handle logs to STDOUT.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
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
    static logWarning(message) {
        console.log(`${'W'.yellow} [${"PC".cyan} v${config_1.VERSION.bold} @ ${new Timestamp_1.Timestamp().logFormat().yellow}] ${message}`);
    }
    static newRound(height, proposer) {
        Logger.logEvent(`${`Starting block #${height}:`.blue} Validator ${proposer.bold} is proposer.`);
    }
    static mempool(message) {
        Logger.logEvent(`${'Mempool:'.magenta.bold} ${message}`);
    }
    static mempoolErr(message) {
        Logger.logError(`${'Mempool'.magenta} ${'Error:'.red} ${message}`);
    }
    static mempoolWarn(message) {
        Logger.logWarning(`${'Mempool'.magenta} ${'Warning:'.yellow} ${message}`);
    }
    static consensus(message) {
        Logger.logEvent(`${'Consensus:'.cyan} ${message}`);
    }
    static consensusErr(message) {
        Logger.logError(`${'Consensus'.cyan} ${'Error:'.red} ${message}`);
    }
    static consensusWarn(message) {
        Logger.logWarning(`${'Consensus'.cyan} ${'Warning:'.yellow} ${message}`);
    }
    static rebalancer(message, round) {
        Logger.logEvent(`${'Rebalancer'.green} ${`(round #${round}):`.green} ${message}`);
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
    static txEvt(message) {
        Logger.logEvent(`${'Broadcaster:'.red} ${message}`);
    }
    static txErr(message) {
        Logger.logError(`${'Broadcaster'} ${'Error:'.red} ${message}`);
    }
}
exports.Logger = Logger;
