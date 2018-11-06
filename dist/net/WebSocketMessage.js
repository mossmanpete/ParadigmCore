"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class WebSocketMessage {
    static sendMessage(ws, message) {
        const msg = {
            "event": "message",
            "timestamp": Math.floor(Date.now() / 1000),
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
