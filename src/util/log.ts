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
    if (level > lvl || _.isUndefined(levels[lvl])) { return; }
    console.log(`${ts()} ${msg}`);
}

export function logStart(msg?) {
    // return if invalid function call
    if (!msg) {
        print(
            `${c.bold.green("startup")}\t${c.bold("info")}\t` +
            `starting ${c.bold.blue("paradigm-core")} v${version}...`,
            2
        );
    } else {
        print(
            `${c.bold.green("startup")}\t${c.bold("info")}\t${msg}`,
            2
        );
    }
}

export function log(mod: string, msg: string) {
    // return if invalid function call
    if (_.isUndefined(defs[mod]) || !_.isString(msg)) { return; }

    // write to stdout with log level 0 (info/all)
    print(
        `${c.bold[(defs[mod].color)](defs[mod].label)}\t${c.bold("info")}\t${msg}`,
        0
    );
}

export function warn(mod: string, msg: string) {
    // return if invalid function call
    if (_.isUndefined(defs[mod]) || !_.isString(msg)) { return; }

    // write to stdout with log level 1 (warnings)
    print(
        `${c.bold[(defs[mod].color)](defs[mod].label)}\t${c.bold.yellow("warn")}\t${msg}`,
        1
    );
}

export function err(mod: string, msg: string) {
    // return if invalid function call
    if (_.isUndefined(defs[mod]) || !_.isString(msg)) { return; }

    // write to stdout with log level 2 (errors)
    print(
        `${c.bold[(defs[mod].color)](defs[mod].label)}\t${c.bold.red("error")}\t${msg}`,
        2
    );
}
