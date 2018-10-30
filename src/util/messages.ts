/*
  =========================
  ParadigmCore: Blind Star
  messages.ts @ {master}
  =========================

  @date_initial 1 October 2018
  @date_modified 29 October 2018
  @author Henry Harder

  Simple message object to store common ABCI and WS messages.
*/

import { WS_PORT, ABCI_PORT, API_PORT } from "../config";

export let messages  = {
    general: {
        messages: {
            start: "Initialization complete, begining new block production."
        }, 
        errors: {
            fatal: "Fatal error detected. Exiting."
        }
    },
    websocket: {
        errors: {
            broadcast:  "Error broadcasting websocket event.",
            connect:    "Error establishing websocket connection.",
            message:    "Error sending websocket message.",
            fatal:      "Fatal error starting websocket server. Exiting."
        },
        messages: {
            connected:  `Connected to the OrderStream network at ${new Date().toLocaleString()}`,
            servStart:  `WebSocket server started on port ${WS_PORT}`,
        }
    },
    abci: {
        errors: {
            decompress: "Bad order object: error decompressing transaction.",
            format:     "Bad order object: invalid Paradigm order format.",
            fatal:      "Fatal error initializing application. Exiting.",
            tmFatal:    "Fatal error starting Tendermint core. Exiting.",
            broadcast:  "Error broadcasting orders (may require process termination).",
            txType:     "Invalid transaction type rejected." 
        },
        messages: {
            incoming:   {
                checkTx:    "Incoming ABCI transaction in 'checkTx()'",
                deliverTx:  "Incoming ABCI transaction in 'deliverTx()'"
            },
            mempool:    "New order passed mempool verification (checkTx).",
            noStake:    "New order rejected: invalid poster or no poster stake.",
            verified:   "New order verified and added to OrderStream queue (deliverTx).",
            servStart:  `ABCI server started on port ${ABCI_PORT}.`,
            roundDiff:  "This round deliverTx state is more than 1 period ahead of commited state.",
        }
    },
    api: {
        errors: {
            badJSON:    "Bad JSON format, check TX and try again.",
            parsing:    "Error parsing order, check format and try again.",
            response:   "Error sending HTTP response.",
            fatal:      "Fatal error starting API server. Exiting."
        },
        messages: {
            starting: "Starting HTTP API server...",
            servStart: `API server started on port ${API_PORT}.`
        }
    },
    rebalancer: {
        messages: {
            activated:  "Stake rebalancer activated. Subscribed to Ethereum events.",
            iAccept:     "Valid initial (genesis) rebalance proposal accepted.",
            iReject:     "Invalid initial (genesis) rebalance proposal rejected.",
            accept:     "Valid rebalance proposal accepted.",
            reject:     "Invalid rebalance proposla rejected.",
            wrongRound: "Rejected proposal for incorrect staking period.",
            noMatch:    "Rejected proposal that does not match local mapping."
        },
        errors: {
            fatalStake: "Fatal error encountered processing stake event.",
            badStakeEvent: "Bad stake event.",
            badBlockEvent: "Bad block event."
        }
    }
}