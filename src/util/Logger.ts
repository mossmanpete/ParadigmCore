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

import { VERSION } from "../config";
import { Timestamp } from "./Timestamp"
import "colors";

export class Logger {

    public static logStart(): void {
        console.log(`${'S'.magenta} [${"PC".cyan} v${VERSION.bold} @ ${new Timestamp().logFormat().yellow}] Starting ${'ParadigmCore (ALPHA)'.cyan.bold} version ${VERSION.red}`);
    }

    public static logEvent(message: string): void {
        console.log(`${'I'.green} [${"PC".cyan} v${VERSION.bold} @ ${new Timestamp().logFormat().yellow}] ${message}`)
    }

    public static logError(message: string): void {
        console.log(`${'E'.red} [${"PC".cyan} v${VERSION.bold} @ ${new Timestamp().logFormat().yellow}] ${message.red}`)
    }

    public static logWarning(message: string): void {
        console.log(`${'W'.yellow} [${"PC".cyan} v${VERSION.bold} @ ${new Timestamp().logFormat().yellow}] ${message}`)
    }

    public static newRound(height: number, proposer: string): void {
        Logger.logEvent(`${`Starting block #${height}:`.blue} Validator ${proposer.bold} is proposer.`);
    }

    public static mempool(message: string){
        Logger.logEvent(`${'Mempool:'.magenta.bold} ${message}`);
    }

    public static mempoolErr(message: string){
        Logger.logError(`${'Mempool'.magenta} ${'Error:'.red} ${message}`);
    }

    public static mempoolWarn(message: string){
        Logger.logWarning(`${'Mempool'.magenta} ${'Warning:'.yellow} ${message}`);
    }

    public static consensus(message: string){
        Logger.logEvent(`${'Consensus:'.cyan} ${message}`);
    }

    public static consensusErr(message: string){
        Logger.logError(`${'Consensus'.cyan} ${'Error:'.red} ${message}`);
    }

    public static consensusWarn(message: string){
        Logger.logWarning(`${'Consensus'.cyan} ${'Warning:'.yellow} ${message}`);
    }

    public static rebalancer(message: string, round: number){
        Logger.logEvent(`${'Rebalancer'.green} ${`(round #${round}):`.green} ${message}`);
    }

    public static rebalancerErr(message: string){
        Logger.logError(`${'Rebalancer'.green} ${'Error:'.red} ${message}`);
    }

    public static websocketEvt(message: string){
        Logger.logEvent(`${'WebSocket:'.red} ${message}`);
    }

    public static websocketErr(message: string){
        Logger.logError(`${'WebSocket'.red} ${'Error:'.red} ${message}`);
    }

    public static apiEvt(message: string){
        Logger.logEvent(`${'API Server:'.yellow} ${message}`);
    }

    public static apiErr(message: string){
        Logger.logError(`${'API Server'.yellow} ${'Error:'.red} ${message}`);
    }

    public static txEvt(message: string){
        Logger.logEvent(`${'Broadcaster:'.red} ${message}`);
    }

    public static txErr(message: string){
        Logger.logError(`${'Broadcaster'} ${'Error:'.red} ${message}`);
    }
}