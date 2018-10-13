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
import "colors";

export class Logger {

    public static logStart(): void {
        console.log(`${'S'.magenta.bold} [${"PC".cyan.bold} v${VERSION.bold} @ ${Date.now().toString().yellow.italic}] Starting ${'ParadigmCore'.cyan.bold} (ALPHA) version ${VERSION.red.bold}`);
    }

    public static logEvent(message: string): void {
        console.log(`${'I'.green.bold} [${"PC".cyan.bold} v${VERSION.bold} @ ${Date.now().toString().yellow.italic}] ${message}`)
    }

    public static logError(message: string): void {
        console.log(`${'E'.white.bgRed} [${"PC".cyan.bold} v${VERSION.bold} @ ${Date.now().toString().yellow.italic}] ${message.red}`)
    }

    public static newRound(height: number, proposer: string): void {
        Logger.logEvent(`${`Starting block #${height}:`.blue.bold} Validator ${proposer.bold} is proposer.`);
    }

    public static mempool(message: string){
        Logger.logEvent(`${'Mempool:'.magenta.bold} ${message}`);
    }

    public static consensus(message: string){
        Logger.logEvent(`${'Consensus:'.green.bold} ${message}`);
    }
}