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

export class Logger {
    public static logEvent(message): void{
        console.log(`[ParadigmCore @ v${VERSION}: ${new Date().toLocaleString()}] Event: ${message}`)
    }
    public static logError(message): void{
        console.log(`[ParadigmCore @ v${VERSION}: ${new Date().toLocaleString()}] Error: ${message}`)
    }
}