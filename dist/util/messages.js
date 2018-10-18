"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  messages.ts @ {rebalance-refactor}
  =========================

  @date_inital 1 October 2018
  @date_modified 16 October 2018
  @author Henry Harder

  Simple message object to store common ABCI and WS messages.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
exports.messages = {
    websocket: {
        errors: {
            broadcast: "Error broadcasting websocket event.",
            connect: "Error establishing websocket connection.",
            message: "Error sending websocket message."
        },
        messages: {
            connected: `Connected to the OrderStream network at ${new Date().toLocaleString()}`,
            servStart: `WebSocket server started on port ${config_1.WS_PORT}`,
        }
    },
    abci: {
        errors: {
            decompress: "Bad order object: error decompressing transaction.",
            format: "Bad order object: invalid Paradigm order format.",
            fatal: "Fatal error initializing application."
        },
        messages: {
            incoming: {
                checkTx: "Incoming ABCI transaction in 'checkTx()'",
                deliverTx: "Incoming ABCI transaction in 'deliverTx()'"
            },
            mempool: "New order passed mempool verification (checkTx).",
            noStake: "New order rejected: invalid poster or no poster stake.",
            verified: "New order verified and added to OrderStream queue (deliverTx).",
            servStart: `ABCI server started on port ${config_1.ABCI_PORT}.`
        }
    },
    api: {
        errors: {
            badJSON: "Bad JSON format, check TX and try again.",
            parsing: "Error parsing order, check format and try again.",
            response: "Error sending HTTP response.",
            fatal: "Fatal error starting API server."
        },
        messages: {
            starting: "Starting HTTP API server...",
            servStart: `API server started on port ${config_1.API_PORT}.`
        }
    },
    rebalancer: {
        errors: {
            fatalStake: "Fatal error encountered processing stake event.",
            badStakeEvent: "Bad stake event.",
            badBlockEvent: "Bad block event."
        }
    }
};
