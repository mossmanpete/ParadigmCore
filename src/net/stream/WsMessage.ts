/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name WsMessage.ts
 * @module src/net/stream
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  27-August-2018
 * @date (modified) 05-November-2018
 *
 * Simple wrapper class for JSON WebSocket messages.
 */

/**
 * Represents a WebSocket response message for OrderStream events.
 */
export class WsMessage {
    public static sendMessage(ws, message: string): void {
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
        } catch (error) {
            throw new Error("Error sending WS event.");
        }
    }

    public static sendOrder(ws, order: object): void {
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
        } catch (error) {
            throw new Error("Error sending WS event.");
        }
    }

    public static sendStream(ws, stream: object): void {
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
        } catch (error) {
            throw new Error("Error sending WS event.");
        }
    }
}
