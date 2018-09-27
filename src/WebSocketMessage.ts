/*
  =========================
  Blind Star - codename (developent)
  wsMessage.ts @ {dev}
  =========================
  @date_inital 27 August 2018
  @date_modified 27 September 2018
  @author Henry Harder

  Simple class for creating and sending JSON messages using WebSocket.
*/

export class WebSocketMessage {
    public static sendMessage(ws, message: string): void {
        let msg = {
            "event": "message",
            "timestamp": Math.floor(Date.now()/1000),
            "data-type": "string",
            "data": message
        }

        ws.send(`${JSON.stringify(msg)}\n`);
    }

    public static sendOrder(ws, order: object): void {
        let msg = {
            "event": "order",
            "timestamp": Math.floor(Date.now()/1000),
            "data-type": "JSON",
            "data": order
        }

        ws.send(`${JSON.stringify(msg)}\n`);
    }
}