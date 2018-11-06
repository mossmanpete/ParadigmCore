"use strict";
/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name WebSocketMessage.ts
 * @module src/net
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  27-August-2018
 * @date (modified) 05-November-2018
 *
 * Simple wrapper class for JSON WebSocket messages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class WebSocketMessage {
    static sendMessage(ws, message) {
        const msg = {
            "event": "message",
            "timestamp": Math.floor(Date.now() / 1000),
            // tslint:disable-next-line:object-literal-sort-keys
            "data-type": "string",
            "data": message,
        };
        try {
            ws.send(`${JSON.stringify(msg)}\n`, (err) => {
                if (err !== undefined) {
                    throw new Error("Error in ws.send(...)");
                }
            });
        }
        catch (error) {
            throw new Error("Error sending WS event.");
        }
    }
    static sendOrder(ws, order) {
        const msg = {
            "event": "order",
            "timestamp": Math.floor(Date.now() / 1000),
            // tslint:disable-next-line:object-literal-sort-keys
            "data-type": "JSON",
            "data": order,
        };
        try {
            ws.send(`${JSON.stringify(msg)}\n`, (err) => {
                if (err !== undefined) {
                    throw new Error("Error in ws.send(...)");
                }
            });
        }
        catch (error) {
            throw new Error("Error sending WS event.");
        }
    }
    static sendStream(ws, stream) {
        const msg = {
            "event": "stream",
            "timestamp": Math.floor(Date.now() / 1000),
            // tslint:disable-next-line:object-literal-sort-keys
            "data-type": "JSON",
            "data": stream,
        };
        try {
            ws.send(`${JSON.stringify(msg)}\n`, (err) => {
                if (err !== undefined) {
                    throw new Error("Error in ws.send(...)");
                }
            });
        }
        catch (error) {
            throw new Error("Error sending WS event.");
        }
    }
}
exports.WebSocketMessage = WebSocketMessage;
