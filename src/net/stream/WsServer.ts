/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name server.ts
 * @module src/net/stream
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  03-December-2018
 * @date (modified) 03-December-2018
 *
 * Implementation of the OrderStream WebSocket server. Creates an "event stream"
 * of valid order and stream broadcast transactions.
 */

// Standard lib imports
import { EventEmitter } from "events";
import * as _ws from "ws";

// ParadigmCore imports
import { Logger } from "../../util/Logger";
import { messages as msg } from "../../util/static/messages";
import { WsMessage as Message } from "./WsMessage";

// "Globals"
let wss: _ws.Server;        // OrderStream event server (WebSocket)
let stream: EventEmitter;   // Global order/stream tracker

/**
 * Bind OrderStream handlers to WebSocket server.
 */
function bind() {
    wss.on("connection", (ws) => {
        try {
            Message.sendMessage(ws, msg.websocket.messages.connected);
        } catch (err) {
            Logger.websocketErr(msg.websocket.errors.connect);
        }

        stream.on("tx", (tx) => {
            try {
                wss.clients.forEach((client) => {
                    if ((client.readyState === 1) && (client === ws)) {
                        Message.sendOrder(client, tx);
                    }
                });
            } catch (err) {
                Logger.websocketErr(msg.websocket.errors.broadcast);
            }
        });

        ws.on("message", (message) => {
            if (message === "close") {
                return ws.close();
            } else {
                Message.sendMessage(ws, `Unknown command '${message}.'`);
            }
        });
    });
}

/**
 * Start and bind OrderStream server (WebSocket).
 *
 * @param port      {number}        event stream WebSocket server bind port
 * @param emitter   {EventEmitter}  global event tracker object
 */
export function start(port: number, emitter: EventEmitter) {
    try {
        // Create WebSocket server
        wss = new _ws.Server({ port }, () => {
            Logger.websocketEvt(msg.websocket.messages.servStart);
        });

        // Load global order emitter
        stream = emitter;

        // Bind handlers to server
        bind();
    } catch (error) {
        throw new Error("Error starting WebSocket server.");
    }
}
