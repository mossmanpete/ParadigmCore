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
import * as rateLimit from "express-rate-limit";
import * as helmet from "helmet";

// ParadigmCore classes and imports
import { TxBroadcaster } from "../../abci/util/TxBroadcaster";
import { TxGenerator } from "../../abci/util/TxGenerator";
import { Logger } from "../../util/Logger";
import { messages as msg } from "../../util/static/messages";
import { HttpMessage as Message } from "./HttpMessage";

// "Globals"
let client: TxBroadcaster;  // Tendermint client for RPC
let generator: TxGenerator; // Generates and signs ABCI tx's
let app = express();        // Express.js server
let paradigm;               // ParadigmConnect driver

// Setup express server
app.enable("trust proxy");
app.use(helmet());          // More secure headers
app.use(cors());            // Cross-origin resource sharing (helps browsers)
app.use(bodyParser.json()); // JSON request and response

// Begin handler implementation

const postHandler = async (req, res, next) => {
    // Create transaction object
    let tx: SignedTransaction;

    /*
    // Commenting out until v0.5
    const paradigmOrder = new paradigm.Order(req.body);
    if (!await paradigmOrder.isValid()) {
        Logger.apiEvt("Invalid Order rejected.");
        Message.staticSendError(res, "Order is invalid.", 422);
    } else {
    */

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
    // }
};

const errorHandler = (err, req, res, next) => {
    try {
        Message.staticSendError(res, msg.api.errors.badJSON, 400);
    } catch (err) {
        Logger.apiErr(msg.api.errors.response);
    }
};

// End handler implementations

/**
 * Start and bind API server.
 *
 * @param options {object} options object with:
 * - options.broadcaster    {TxBroadcaster} transaction broadcaster instance
 * - options.generator      {TxGenerator}   validator tx generator instance
 * - options.paradigm       {Paradigm}      paradigm-connect instance
 * - options.port           {number}        port to bind HTTP server to
 * - options.rateWindow     {number}        window (in ms) to rate-limit over
 * - options.rateMax        {number}        no. of requests allowed per window
 */
export async function start(options) {
    try {
        // Store TxBroadcaster and TxGenerator
        client = options.broadcaster;
        generator = options.generator;

        // Paradigm-connect instance
        paradigm = options.paradigm;

        // Setup rate limiting
        const limiter = rateLimit({
            windowMs: options.rateWindow,
            max: options.rateMax
        });
        app.use(limiter);

        // Attach handlers
        app.post("/*", postHandler);
        app.use(errorHandler);

        // Start API server
        await app.listen(options.port);
        Logger.apiEvt(msg.api.messages.servStart);
        return;
    } catch (err) {
        throw new Error(err.message);
    }
}
