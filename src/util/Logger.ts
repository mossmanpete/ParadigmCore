/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name Logger.ts
 * @module src/util
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  27-October-2018
 * @date (modified) 02-November-2018
 *
 * Logger class for modules to log formatted messages to STDOUT.
 *
 * @todo Make this less stupid
 */

/* tslint:disable */

const VERSION = process.env.npm_package_version;

import { Timestamp } from "./Timestamp";
import "colors";

export class Logger {

    private static time(): string | any {
        let dateTime = new Date().toISOString().split("T");
        return `${dateTime[0]} ${dateTime[1].split("Z")[0]}`.bold;
    }

    /**
     * Format message and log to STDOUT.
     * 
     * @param event {string} event type (error, warning, etc)
     * @param input {string} main log message
     */
    public static print(event: string, input: string): void {
        console.log(`${Logger.time().black} ${event.bold} ${input}`);
    }

    public static logStart(): void {
        Logger.print("startup", `starting ${'paradigm-core'.cyan.bold} v${VERSION}...`);
    }

    public static logEvent(message: string): void {
        Logger.print("event".cyan, message)
    }

    public static logError(message: string): void {
        Logger.print("error".red, message);
    }

    public static logWarning(message: string): void {
        Logger.print("warning".yellow, message)
    }

    public static newRound(height: number, proposer: string): void {
        Logger.logEvent(`${`starting block #${height}:`.blue} proposed by validator ${proposer.bold}\n`);
    }

    public static mempool(message: string){
        Logger.logEvent(`${'mempool:'.magenta} ${message}`);
    }

    public static mempoolErr(message: string){
        Logger.logError(`${'mempool:'.magenta} ${message}`);
    }

    public static mempoolWarn(message: string){
        Logger.logWarning(`${'mempool:'.magenta} ${message}`);
    }

    public static consensus(message: string){
        Logger.logEvent(`${'consensus:'.cyan} ${message}`);
    }

    public static consensusErr(message: string){
        Logger.logError(`${'consensus:'.cyan} ${message}`);
    }

    public static consensusWarn(message: string){
        Logger.logWarning(`${'consensus:'.cyan} ${message}`);
    }

    public static rebalancer(message: string, round?: number){
        if (round) {
            Logger.logEvent(`${'rebalancer'.green} ${`round #${round}:`.green} ${message}`);
        } else {
            Logger.logEvent(`${'rebalancer:'.green} ${message}`);
        }
    }

    public static rebalancerErr(message: string){
        Logger.logError(`${'rebalancer'.green} ${message}`);
    }

    public static websocketEvt(message: string){
        Logger.logEvent(`${'ws server:'.red} ${message}`);
    }

    public static websocketErr(message: string){
        Logger.logError(`${'ws server:'.red} ${message}`);
    }

    public static apiEvt(message: string){
        Logger.logEvent(`${'api server:'.yellow} ${message}`);
    }

    public static apiErr(message: string){
        Logger.logError(`${'api server:'.yellow} ${message}`);
    }

    public static txEvt(message: string){
        Logger.logEvent(`${'broadcaster:'.red} ${message}`);
    }

    public static txErr(message: string){
        Logger.logError(`${'broadcaster:'} ${message}`);
    }
}