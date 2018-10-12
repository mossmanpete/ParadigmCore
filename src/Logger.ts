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
    public static logEvent(message): void {
        console.log(`[${"ParadigmCore".cyan.bold} @ v${VERSION}: ${new Date().toLocaleString()}] ${"Event:".green.bold} ${message}`)
    }
    public static logError(message): void {
        console.log(`[${"ParadigmCore".cyan.bold} @ v${VERSION}: ${new Date().toLocaleString()}] ${"Error:".red.bold} ${message}`)
    }
}