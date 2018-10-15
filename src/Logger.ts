/*
  =========================
  ParadigmCore: Blind Star
  Logger.ts @ {master}
  =========================

  @date_inital 25 September 2018
  @date_modified 25 September 2018
  @author Henry Harder

  Simple Logger class to handle logs to STDOUT.
*/

import { VERSION } from "./config";
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

    public static newRound(height: number, proposer: string): void {
        Logger.logEvent(`${`Starting block #${height}:`.blue} Validator ${proposer.bold} is proposer.`);
    }

    public static mempool(message: string){
        Logger.logEvent(`${'Mempool:'.magenta.bold} ${message}`);
    }

    public static consensus(message: string){
        Logger.logEvent(`${'Consensus:'.bold} ${message}`);
    }
}