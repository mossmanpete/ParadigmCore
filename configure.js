#!/usr/local/bin/node
const { spawn } = require("child_process");
const { readdirSync, appendFileSync } = require('fs');
const env = require("dotenv").config().parsed;
let tendermint, pchome, tmhome, privValidator, priv_key, pub_key, address;

// exit if ParadigmCore home directory not set
if (
    process.env.PCHOME === undefined || 
    process.env.PCHOME.toLocaleLowerCase() !== process.cwd().toLocaleLowerCase()
) {
    console.log("\nParadigmCore setup failed...");
    console.log("Environment variable PCHOME is not set, or does not match CWD.\n");
    process.exit(1);
} else {
    pchome = process.env.PCHOME;
    tmhome = `${pchome}/lib/tendermint`; 
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
    console.log("\nParadigmCore setup failed...");
    console.log("Missing the following required parameters:\n")
    missing.forEach((k, i) => console.log(`\t${i+1}.\t${k}`));
    console.log("\nPlease fix your environment file and try again.");
    process.exit(1);
}

if (env.NODE_TYPE.toLowerCase() === "validator") {
    if (
        !env.PRIV_KEY || !env.PUB_KEY || !env.NODE_ID
    ) {
        setupValidator();
    } else {
        validateKeys();
    }
}

function setupValidator() {
    console.log("configuring and setting up tendermint...\n");
    try {
        tendermint = require("./lib/tendermint");
    } catch (err) {
        console.log(`\nParadigmCore setup failed with: ${err.message}`);
        console.log("Missing tendermint driver... check /lib and try again.");
        process.exit(1);
    }

    // check if there is already a data and/or config dir
    console.log("checking for existing node configuration...\n");
    let tmConts = readdirSync(tmhome);
    if (tmConts.indexOf("data") !== -1 && tmConts.indexOf("config") !== -1) {
        console.log("detected existing node config directory.\n");
        console.log("skipping node config initialization...\n");
        copyKeysToEnv();
        // moveGenesisFile();
        return;
    }

    // create tendermint home directory
    console.log("no existing configuration detected.\n");
    console.log("creating new tendermint configuration...\n");
    try {
        tendermint.initSync(tmhome);
    } catch (err) {
        console.log(`\nParadigmCore setup failed with: ${err.message}`);
        console.log("failed to setup tendermint config.");
        process.exit(1);
    }
    console.log(`created tendermint config in '${pchome}/lib/tendermint.'\n`);
    copyKeysToEnv();
}

function validateKeys() {
    console.log("loading validator key...\n");
    try {
        const pathstr = `${tmhome}/config/priv_validator.json`;
        privValidator = require(pathstr);
        console.log("successfully loaded validator keypair.\n")
    } catch (err) {
        console.log(`failed to load keypair: ${err.message}`);
        process.exit(1);
    }

    console.log("validating validator keys...\n");
    address = privValidator.address;
    priv_key = privValidator.priv_key.value;
    pub_key = privValidator.pub_key.value;

    if (
        Buffer.from(address, "hex").length !== 20 ||
        Buffer.from(priv_key, "base64").length !== 64 ||
        Buffer.from(pub_key, "base64").length !== 32
    ) {
        console.log("current private keys invalid... please regenerate.\n");
        process.exit(1);
    } else {
        console.log("successfully validated keys.\n");
    }
}

function copyKeysToEnv() {
    console.log("validating tendermint keys...\n");
    validateKeys();
    console.log("copying keys to environment file...\n");
    try {
        appendFileSync(".env", `PRIV_KEY="${priv_key}"\n`);
        appendFileSync(".env", `PUB_KEY="${pub_key}"\n`);
        appendFileSync(".env", `NODE_ID="${address}"\n`);
    } catch (err) {
        console.log(`\nParadigmCore setup failed with: ${err.message}`);
        console.log("failed to copy keys to environment.");
        process.exit(1);
    }
    console.log("successfully copied keys to environment file.\n");
    return;
}


