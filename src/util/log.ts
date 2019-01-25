import * as c from "ansi-colors";
import * as _ from "lodash";
import { levels, modules as defs } from "./log.json";

const level = process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 0;
const version = process.env.npm_package_version;

function ts(): string {
    let dt = new Date().toISOString().split("T");
    return c.bold.black(`${dt[0]} ${dt[1].split("Z")[0]}`);
}

function print(msg, lvl) {
    if (lvl === -1) {  console.log(`\n${ts()} ${msg}\n`); return; }
    if (level > lvl || _.isUndefined(levels[lvl])) { return; }
    console.log(`${ts()} ${msg}`);
}

export function logStart(msg?) {
    if (msg) {
        print(
            `${c.gray("lvl:")} ${c.bold("info")}\t` +
            `${c.gray("mod:")} ${c.bold.green("startup")}\t` +
            `${c.gray("msg:")} ${msg}`,
            2
        );
        return;
    }

    // special welcome message
    print(
        `${c.gray("lvl:")} ${c.bold("info")}\twelcome :)\t` +
        `starting ${c.bold.greenBright("paradigm core")}` +
        ` v${version}`,
        -1
    );
}

export function log(mod: string, msg: string, height?: number, hash?: string) {
    // return if invalid function call
    if (_.isUndefined(defs[mod]) || !_.isString(msg)) { return; }

    // special cases for state machine ("core") module and TM blockchain
    const ifHeight = height ? `${c.gray("height: ")} ${height}\t` : "";
    const ifHash = hash ? `${c.gray("appHash: ")} ${hash}` : "";

    // write to stdout with log level 0 (info/all)
    print(
        `${c.gray("lvl:")} ${c.bold("info")}\t` + 
        `${c.gray("mod:")} ${c.bold[(defs[mod].color)](defs[mod].label)}\t` + 
        `${c.gray("msg:")} ${msg}\t` + ifHeight + ifHash,
        0
    );
}

export function warn(mod: string, msg: string) {
    // return if invalid function call
    if (_.isUndefined(defs[mod]) || !_.isString(msg)) { return; }

    // write to stdout with log level 1 (warnings)
     print(
        `${c.gray("lvl:")} ${c.bold.yellow("warn")}\t` + 
        `${c.gray("mod:")} ${c.bold[(defs[mod].color)](defs[mod].label)}\t` + 
        `${c.gray("msg:")} ${msg}`,
        1
    );
}

export function err(mod: string, msg: string) {
    // return if invalid function call
    if (_.isUndefined(defs[mod]) || !_.isString(msg)) { return; }

    // write to stdout with log level 2 (errors)
    print(
        `${c.gray("lvl:")} ${c.bold.red("error")}\t` + 
        `${c.gray("mod:")} ${c.bold[(defs[mod].color)](defs[mod].label)}\t` + 
        `${c.gray("msg:")} ${msg}`,
        2
    );
}
