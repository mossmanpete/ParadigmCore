/*
  =========================
  ParadigmCore: Blind Star
  WebSocketMessage.ts @ {master}
  =========================
  
  @date_inital 27 August 2018
  @date_modified 19 October 2018
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

        try {
            ws.send(`${JSON.stringify(msg)}\n`, (err) => {
                if(err != undefined){
                    throw new Error("Error in ws.send(...)");
                }
            });
        } catch (error) {
            throw new Error('Error sending WS event.');   
        } 
    }

    public static sendOrder(ws, order: object): void {
        let msg = {
            "event": "order",
            "timestamp": Math.floor(Date.now()/1000),
            "data-type": "JSON",
            "data": order
        }

        try {
            ws.send(`${JSON.stringify(msg)}\n`, (err) => {
                if(err != undefined){
                    throw new Error("Error in ws.send(...)");
                }
            });
        } catch (error) {
            throw new Error('Error sending WS event.');   
        } 
    }

    public static sendStream(ws, stream: object): void {
        let msg = {
            "event": "stream",
            "timestamp": Math.floor(Date.now()/1000),
            "data-type": "JSON",
            "data": stream
        }

        try {
            ws.send(`${JSON.stringify(msg)}\n`, (err) => {
                if(err != undefined){
                    throw new Error("Error in ws.send(...)");
                }
            });
        } catch (error) {
            throw new Error('Error sending WS event.');   
        } 
    }
}