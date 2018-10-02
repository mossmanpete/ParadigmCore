import { WS_PORT, ABCI_PORT, API_PORT } from "./config";

export let messages  = {
    websocket: {
        errors: {
            broadcast:  "Error broadcasting websocket event.",
            connect:    "Error establishing websocket connection.",
            message:    "Error sending websocket message."
        },
        messages: {
            connected:  `Connected to the OrderStream network at ${new Date().toLocaleString()}`,
            servStart:  `WebSocket server started on port ${WS_PORT}`,
        }
    },
    abci: {
        errors: {
            decompress: "Bad order object: error decompressing transaction.",
            format:     "Bad order object: invalid Paradigm order format."   
        },
        messages: {
            incoming:   {
                checkTx:    "Incoming ABCI transaction in 'checkTx()'",
                deliverTx:  "Incoming ABCI transaction in 'deliverTx()'"
            },
            mempool:    "Order added to local mempool.",
            noStake:    "Order rejected: invalid poster or no poster stake.",
            verified:   "Order verified and broadcast via OrderStream event stream.",
            servStart:  `ABCI server started on port ${ABCI_PORT}.`
        }
    },
    api: {
        errors: {
            badJSON: "Bad JSON format, check TX and try again.",
            parsing: "Error parsing order, check format and try again."
        },
        messages: {
            servStart: `API server started on port ${API_PORT}.`
        }
    }
}