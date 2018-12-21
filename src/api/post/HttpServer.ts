/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name HttpServer.ts
 * @module src/api/post
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  24-September-2018
 * @date (modified) 19-December-2018
 *
 * ExpressJS server to enable incoming orders to be received as POST requests.
 *
 * @10-16: TODO: support StreamBroadcast type.
 */

// 3rd party imports
import * as bodyParser from "body-parser";
import cors = require("cors");
import * as express from "express";
import * as wrapAsync from "express-async-handler";
import * as rateLimit from "express-rate-limit";
import * as helmet from "helmet";

// ParadigmCore classes and imports
import { TxBroadcaster } from "../../core/util/TxBroadcaster";
import { TxGenerator } from "../../core/util/TxGenerator";
import { err, log, logStart, warn } from "../../util/log";
import { messages as msg } from "../../util/static/messages";
import { HttpMessage as Message } from "./HttpMessage";

// Type defs
import { NextFunction, Request, RequestHandler, Response } from "express";

// "Globals"
let client: TxBroadcaster;  // Tendermint client for RPC
let generator: TxGenerator; // Generates and signs ABCI tx's
let app = express();        // Express.js server
let paradigm;               // ParadigmConnect driver

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
            max: options.rateMax,
            message: {
              error: 429,
              message: "burst request limit reached"
            }
        });

        // Setup express server
        app.enable("trust proxy");
        app.use(limiter);
        app.use(helmet());
        app.use(cors());
        app.use(bodyParser.json());
        app.post("/*", wrapAsync(postHandler));
        app.use(errorHandler);

        // Start API server
        await app.listen(options.port);
        return;
    } catch (error) {
        throw new Error(error.message);
    }
}

/**
 * Express POST handler for incoming orders (and eventually stream tx's).
 */
async function postHandler(req: Request, res: Response, next: NextFunction) {
    // Create transaction object
    let tx: SignedTransaction;

    // verify order validity before submitting to state machine
    const paradigmOrder = new paradigm.Order(req.body);
    if (!await paradigmOrder.isValid()) {
        warn("api", "invalid order rejected");
        Message.staticSendError(res, "submitted order is invalid.", 422);
    } else {
        // create and sign transaction (as validator)
        tx = generator.create({ data: req.body, type: "order" });

        // submit transaction to mempool and network
        const response = await client.send(tx);

        // send response from application back to client
        Message.staticSend(res, response);
    }
}

/**
 * General error handler.
 */
function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
    console.log("in err handler:" + error);
    try {
        Message.staticSendError(res, `request failed with error: ${error.message}`, 500);
    } catch (caughtError) {
        err("api", msg.api.errors.response);
        err("api", `reported error: ${caughtError.message}`);
    }
}
