#!/usr/local/bin/node
/**
 * ParadigmCore (optional) initialize/setup script
 * 
 * Can perform the following:
 * - sets required environment variable
 * - download tendermint binary
 * - set up tendermint config and data-store
 * - generate validator keypair and node_id
 * - copy new keys from tendermint config to environment
 * - validates environment config file
 * - validates copied keys
 **/

// imports, scope, etc.
const { execSync } = require("child_process");
const { readdirSync, appendFileSync, readFileSync } = require('fs');
const env = require("dotenv").config().parsed;
const c = require("ansi-colors");
let tendermint, pchome, tmhome, privValidator, priv_key, pub_key, address;

// stdout formatter functions, etc
let n = 0;
const write = m => console.log(`\n\t${c.bold(`@${++n}`)}\t${m}`);
const err = m => console.log(`\n\t${c.red.bold(m)}`);

// exit and indicate failure if node is incompatible
let semVer = process.version.slice(1).split(".").map(i => parseInt(i));
semVer[0] <= 10 ? versionArr[1] >= 4 ? null : fail("Node.JS v10.4 or greater required.") : null;

// exit if paradigmcore home directory environment var not set
if (
    process.env.PCHOME === undefined || 
    process.env.PCHOME.toLocaleLowerCase() !== process.cwd().toLocaleLowerCase()
) {
    fail("Environment variable PCHOME is not set, or does not match CWD.");
} else {
    write("Setting tendermint home directory...")
    pchome = process.env.PCHOME;
    tmhome = `${pchome}/lib/tendermint`;
    try {
        write("Checking environment file (step 1/2)...");
        if (!env) {
            fail(
                "Missing or empty environment file (should at be $PCHOME/.env)\n"+
                "\tTry starting with a template from $PCHOME/lib"
            );
        } else if (!env.TM_HOME || env.TM_HOME === "") {
            appendFileSync(".env", `\nTM_HOME="${tmhome}"\n`);
        } else {
            write("TM_HOME already set, skipping.");
        }
    } catch (error) {
        fail("Failed to set tendermint home; check /lib and try again.", error);
    }
}

// check if tendermint binary is already installed, download if needed
if (readdirSync(`${tmhome}/bin`).indexOf("tendermint") === -1) {
    write("No tendermint install found, downloading...");
    try {
        let upV = readFileSync(`${tmhome}/bin/version`).toString("utf8");
        execSync(`node ${tmhome}/bin/download.js`);
        execSync(`node ${tmhome}/bin/update.js ${upV}`);
        write("Successfully downloaded and updated tendermint.");
    } catch (error) {
        fail("Failed to download or verify tendermint binary.", error);
    }
}

// initially required variables
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
    "MAX_ORDER_SIZE",
    "SIG_ENC",
]

// check for missing options
write("Checking environment file (step 2/2)...");
checkReqs(reqVars, env);

if (!env.PRIV_KEY && !env.PUB_KEY && !env.NODE_ID) {
    setupValidator();
    validateEnvironment();
} else if (!env.PRIV_KEY || !env.PUB_KEY || !env.NODE_ID) {
    fail("Please remove 'NODE_ID', 'PRIV_KEY', and 'PUB_KEY' from .env.");
} else {
    validateKeys();
    validateEnvironment();
}

// setup tendermint config/data dir
function setupValidator() {
    write("Configuring and setting up tendermint...");
    try {
        tendermint = require("./lib/tendermint");
    } catch (error) {
        fail("Missing tendermint driver... check /lib and try again.", error);
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
        fail("Failed to setup tendermint config and data directories.", error);
    }
    write(`Created tendermint config in '${pchome}/lib/tendermint.'`);
    copyKeysToEnv();
}

// validate keys (purely based on structure) from priv_validator.json only
function validateKeys() {
    write("Loading validator keys...");
    try {
        const pathstr = `${tmhome}/config/priv_validator.json`;
        privValidator = require(pathstr);
    } catch (error) {
        fail("Failed to load keypair, try removing 'NODE_ID', ... from .env", error);
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
        fail("Current keys invalid, check keys or regenerate.");
    }
    return;
}

// copy keys from priv_validator.json 
function copyKeysToEnv() {
    write("Validating tendermint keys...");
    validateKeys();
    write("Copying keys to environment file...");
    try {
        appendFileSync(".env", `PRIV_KEY="${priv_key}"\n`);
        appendFileSync(".env", `PUB_KEY="${pub_key}"\n`);
        appendFileSync(".env", `NODE_ID="${address}"\n`);
    } catch (error) {
        fail("Failed to copy keys to environment.", error);
    }
    return;
}

// freshly parse environment vars and priv_validator.json and validate
function validateEnvironment(){
    write("Validating keys in environment file...");
    let newEnv = require("dotenv").config().parsed;
    if (!newEnv) fail("Failed to validate environment file, no file found.");

    // check all reqs, plus keys
    write("Checking for all required config variables...");
    let newReqs = [...reqVars, "TM_HOME", "NODE_ID", "PRIV_KEY", "PUB_KEY"];
    checkReqs(newReqs, newEnv);

    // check env keys match priv_validator.json keys
    write("Checking that config keys match validator keys...");
    try {
        const pathstr = `${tmhome}/config/priv_validator.json`;
        const ks = require(pathstr);
        if (
            !pad(ks.address, "hex").equals(pad(newEnv.NODE_ID, "hex")) ||
            !pad(ks.priv_key.value, "base64").equals(pad(newEnv.PRIV_KEY, "base64")) ||
            !pad(ks.pub_key.value, "base64").equals(pad(newEnv.PUB_KEY, "base64"))
        ) {
            fail("Environment verification failed, keys do not match.");
        }
    } catch (error) {
        fail("Key verification failed, please regenerate.", error);
    }
    done();
}

// buffer generator wrapper
function pad(b, enc) {
    return Buffer.from(b, enc);
}

// check environment object for required config vars
function checkReqs(reqs, env){
    let missing = reqs.filter(k => env[k] === undefined || env[k] === "");
    if (missing.length > 0) {
        fail("Missing the following required parameters:", null, missing);
    }
}

// only called if all setup completes
function done() {
    console.log(c.green.bold("\n\tParadigmCore setup completed!"));
    console.log(c.green.bold("\n\tStart your node with `yarn launch` or `npm run launch`.\n"));
    process.exit(0);
}

// called on fatal failure
function fail(msg, error, missing) {
    // log error message from stack, if present
    if (error) {
        err(`ParadigmCore setup failed with: ${error.message}`);
    } else {
        err(`ParadigmCore setup failed...`);
    }

    // log additional failure message
    err(`${msg}\n`);

    // log missing environment variables
    if (missing) {
        missing.forEach((k, i) => console.log(`\t${i+1}.\t${k}\n`));
        err("Please fix your environment file and try again.\n");
    }
    process.exit(1);
} 
