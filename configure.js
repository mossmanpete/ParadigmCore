#!/usr/local/bin/node
// todo validate keys in env
// todo support full vs validator setup
// todo run tendermint binary install script from here
// -> instead of from package JSON. set env in package?
// -> post install?
// todo deal with case where keys are in env file but all other config is gone

const { spawn } = require("child_process");
const { readdirSync, appendFileSync } = require('fs');
const env = require("dotenv").config().parsed;
const c = require("ansi-colors");
let tendermint, pchome, tmhome, privValidator, priv_key, pub_key, address;


// stdout formatter functions
let n = 0;
const write = m => console.log(`\n\t${c.bold(`@${++n}`)}\t${m}`);
const err = m => console.log(c.red.bold(m));

// exit if ParadigmCore home directory not set
if (
    process.env.PCHOME === undefined || 
    process.env.PCHOME.toLocaleLowerCase() !== process.cwd().toLocaleLowerCase()
) {
    err("\nParadigmCore setup failed...");
    err("Environment variable PCHOME is not set, or does not match CWD.\n");
    process.exit(1);
} else {
    pchome = process.env.PCHOME;
    tmhome = `${pchome}/lib/tendermint`;
    try {
        if (!env.TM_HOME || env.TM_HOME === "") {
            appendFileSync(".env", `\nTM_HOME="${tmhome}"\n`);
        } else {
            write("TM_HOME already set, skipping.");
        }
    } catch (error) {
        err(`\nParadigmCore setup failed with: ${error.message}`);
        err("Failed to set tendermint home; check /lib and try again.");
        process.exit(1);
    }
}

const reqVars = [
    "NODE_TYPE",
    "WEB3_PROVIDER",
    "API_PORT",
    "WS_PORT",
    "WINDOW_MS",
    "WINDOW_MAX",
    "ABCI_HOST",
    "ABCI_RPC_PORT",
    "ABCI_PORT",
    "STAKE_CONTRACT_ADDR",
    "PERIOD_LENGTH",
    "PERIOD_LIMIT",
    "FINALITY_THRESHOLD",
    "CONF_THRESHOLD",
    "MAX_ORDER_SIZE",
    "SIG_ENC",
]

// check for missing options
let missing = reqVars.filter(k => env[k] === undefined || env[k] === "");
if (missing.length > 0) {
    err("\nParadigmCore setup failed:");
    err("Missing the following required parameters:\n")
    missing.forEach((k, i) => console.log(`\t${i+1}.\t${k}`));
    err("\nPlease fix your environment file and try again.");
    process.exit(1);
}

if (
    !env.PRIV_KEY || !env.PUB_KEY || !env.NODE_ID
) {
    setupValidator();
    done();
} else {
    validateKeys();
    done();
}

function setupValidator() {
    write("Configuring and setting up tendermint...");
    try {
        tendermint = require("./lib/tendermint");
    } catch (error) {
        err(`\nParadigmCore setup failed with: ${error.message}`);
        err("Missing tendermint driver... check /lib and try again.");
        process.exit(1);
    }

    // check if there is already a data and/or config dir
    write("Checking for existing node configuration...");
    let tmConts = readdirSync(tmhome);
    if (tmConts.indexOf("data") !== -1 && tmConts.indexOf("config") !== -1) {
        write("Detected existing node config directory.");
        write("Skipping node config initialization...");
        copyKeysToEnv();
        // moveGenesisFile();
        return;
    }

    // create tendermint home directory
    write("No existing configuration detected.");
    write("Creating new tendermint configuration...");
    try {
        tendermint.initSync(tmhome);
    } catch (error) {
        err(`\nParadigmCore setup failed with: ${error.message}`);
        err("Failed to setup tendermint config and data directories.");
        process.exit(1);
    }
    write(`Created tendermint config in '${pchome}/lib/tendermint.'`);
    copyKeysToEnv();
}

function validateKeys() {
    write("Loading validator keys...");
    try {
        const pathstr = `${tmhome}/config/priv_validator.json`;
        privValidator = require(pathstr);
    } catch (error) {
        err(`\nParadigmCore setup failed with: ${error.message}`);
        err(`Failed to load keypair.`);
        process.exit(1);
    }

    write("Validating keys...");
    address = privValidator.address;
    priv_key = privValidator.priv_key.value;
    pub_key = privValidator.pub_key.value;

    if (
        Buffer.from(address, "hex").length !== 20 ||
        Buffer.from(priv_key, "base64").length !== 64 ||
        Buffer.from(pub_key, "base64").length !== 32
    ) {
        err(`\nParadigmCore setup failed:`);
        err("Current keys invalid, check keys or regenerate.\n");
        process.exit(1);
    }
    return;
}

function copyKeysToEnv() {
    write("Validating tendermint keys...");
    validateKeys();
    write("Copying keys to environment file...");
    try {
        appendFileSync(".env", `PRIV_KEY="${priv_key}"\n`);
        appendFileSync(".env", `PUB_KEY="${pub_key}"\n`);
        appendFileSync(".env", `NODE_ID="${address}"\n`);
    } catch (error) {
        err(`\nParadigmCore setup failed with: ${error.message}`);
        err("failed to copy keys to environment.");
        process.exit(1);
    }
    return;
}

function validateEnvironment(){
    // todo
}

function done() {
    console.log(c.green.bold("\n\tParadigmCore setup completed.\n"));
    process.exit(0);
}