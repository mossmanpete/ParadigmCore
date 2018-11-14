"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const ExpressMessage_1 = require("../net/ExpressMessage");
const Logger_1 = require("../util/Logger");
const messages_1 = require("../util/static/messages");
let client;
let generator;
const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use((err, req, res, next) => {
    try {
        ExpressMessage_1.Message.staticSendError(res, messages_1.messages.api.errors.badJSON, 400);
    }
    catch (err) {
        Logger_1.Logger.apiErr(messages_1.messages.api.errors.response);
    }
});
app.post("/*", async (req, res) => {
    let tx;
    try {
        tx = generator.create({
            data: req.body,
            type: "order",
        });
    }
    catch (err) {
        Logger_1.Logger.apiErr("Failed to construct local transaction object.");
        ExpressMessage_1.Message.staticSendError(res, "Internal transaction error, try again.", 500);
    }
    try {
        const response = await client.send(tx);
        Logger_1.Logger.apiEvt("Successfully executed local ABCI transaction.");
        ExpressMessage_1.Message.staticSend(res, response);
    }
    catch (error) {
        Logger_1.Logger.apiErr("Failed to execute local ABCI transaction.");
        ExpressMessage_1.Message.staticSendError(res, "Internal error, try again.", 500);
    }
});
async function startAPIserver(apiPort, broadcaster, txGenerator) {
    try {
        client = broadcaster;
        generator = txGenerator;
        await app.listen(apiPort);
        Logger_1.Logger.apiEvt(messages_1.messages.api.messages.servStart);
        return;
    }
    catch (err) {
        throw new Error("Error starting API server.");
    }
}
exports.startAPIserver = startAPIserver;
