/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name contractABI.ts
 * @module src/util/static
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  01-October-2018
 * @date (modified) 18-December-2018
 *
 * Log message templates and statuses for various modules.
 */

/* tslint:disable */

const { WS_PORT, ABCI_PORT, API_PORT } = process.env;

export let messages  = {
    general: {
        messages: {
            start:  "initialization complete, starting new block production"
        }, 
        errors: {
            fatal:  "fatal error detected, exiting"
        }
    },
    websocket: {
        errors: {
            broadcast:  "failed broadcasting websocket event",
            connect:    "failed establishing websocket connection",
            message:    "failed sending websocket message",
            fatal:      "fatal error starting websocket server, exiting"
        },
        messages: {
            // connected:  `Connected to the OrderStream network at ${new Date().toLocaleString()}`,
            // servStart:  `websocket server started on port ${WS_PORT}`,
        }
    },
    abci: {
        errors: {
            decompress: "bad order object: error decompressing transaction",
            format:     "bad order object: invalid Paradigm order format",
            fatal:      "fatal error initializing application, exiting",
            tmFatal:    "fatal error starting Tendermint core, exiting",
            broadcast:  "failed broadcasting orders (may require process termination)",
            txType:     "invalid transaction type rejected",
            signature:  "error encountered recovering validator signature" 
        },
        messages: {
            incoming:   {
                checkTx:    "incoming abci transaction in 'checkTx()'",
                deliverTx:  "incoming abci transaction in 'deliverTx()'"
            },
            mempool:    "new order passed mempool verification",
            noStake:    "new order rejected: invalid poster or no poster stake",
            verified:   "new order verified and added to OrderStream queue",
            // servStart:  `abci server started on port ${ABCI_PORT}`,
            roundDiff:  "this round deliverTx state is more than 1 period ahead of committed state",
            badSig:     "rejected ABCI transaction with invalid validator signature"
        }
    },
    api: {
        errors: {
            badJSON:    "bad json format, check tx and try again",
            parsing:    "failed parsing order, check format and try again",
            response:   "failed sending http response",
            fatal:      "fatal error starting API server, exiting"
        },
        messages: {
            // starting:   "starting http api server...",
            // servStart:  `api server started on port ${API_PORT}`
        }
    },
    rebalancer: {
        messages: {
            activated:  "witness activated, subscribed to Ethereum events",
            iAccept:    "valid initial (genesis) rebalance proposal accepted",
            iReject:    "invalid initial (genesis) rebalance proposal rejected",
            accept:     "valid rebalance proposal accepted",
            reject:     "invalid rebalance proposal rejected",
            wrongRound: "rejected proposal for incorrect staking period",
            noMatch:    "rejected proposal that does not match local mapping"
        },
        errors: {
            fatalStake:     "fatal error encountered processing stake event",
            badStakeEvent:  "bad stake event",
            badBlockEvent:  "bad block event"
        }
    }
}