/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name HttpServer.ts
 * @module src/api/post
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  24-September-2018
 * @date (modified) 03-December-2018
 *
 * ExpressJS server to enable incoming orders to be received as POST requests.
 *
 * @10-16: TODO: support StreamBroadcast type.
 */

// 3rd party imports
import * as bodyParser from "body-parser";
import cors = require("cors");
import * as express from "express";
import * as helmet from "helmet";

// ParadigmCore classes and imports
import { TxBroadcaster } from "../../abci/util/TxBroadcaster";
import { TxGenerator } from "../../abci/util/TxGenerator";
import { Logger } from "../../util/Logger";
import { messages as msg } from "../../util/static/messages";
import { HttpMessage as Message } from "./HttpMessage";

// "Globals"
let client: TxBroadcaster;              // Tendermint client for RPC
let generator: TxGenerator;    // Generates and signs ABCI tx's
let app = express();

// Setup express server
app.use(helmet());          // More secure headers
app.use(cors());            // Cross-origin resource sharing (helps browsers)
app.use(bodyParser.json()); // JSON request and response

app.use((err, req, res, next) => {
    try {
        Message.staticSendError(res, msg.api.errors.badJSON, 400);
    } catch (err) {
        Logger.apiErr(msg.api.errors.response);
    }
});

app.post("/*", async (req, res) => {
    // Create transaction object
    let tx: SignedTransaction;

    try {
        tx = generator.create({
            data: req.body,
            type: "order",
        });
    } catch (err) {
        Logger.apiErr("Failed to construct local transaction object.");
        Message.staticSendError(res, "Internal transaction error, try again.", 500);
    }

    // Execute local ABCI transaction
    try {
        // Await ABCI response
        const response = await client.send(tx);

        // Send response back to client
        Logger.apiEvt("Successfully executed local ABCI transaction.");
        Message.staticSend(res, response);
    } catch (error) {
        Logger.apiErr("Failed to execute local ABCI transaction.");
        Message.staticSendError(res, "Internal error, try again.", 500);
    }
});

/**
 * Start and bind API server.
 *
 * @param apiPort       {number}        port to bind API server to
 * @param broadcaster   {TxBroadcaster} local transaction broadcaster
 */
export async function start(apiPort, broadcaster, txGenerator) {
    try {
        // Store TxBroadcaster and TxGenerator
        client = broadcaster;
        generator = txGenerator;

        // Start API server
        await app.listen(apiPort);
        Logger.apiEvt(msg.api.messages.servStart);
        return;
    } catch (err) {
        throw new Error("Error starting API server.");
    }
}
