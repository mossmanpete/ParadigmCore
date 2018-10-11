/*
  =========================
  ParadigmCore: Blind Star
  WebSocketMessage.ts @ {dev}
  =========================
  
  @date_inital 27 August 2018
  @date_modified 1 October 2018
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
                    console.log("in ws.send: "+ err);
                    throw new Error("Error in ws.send(...)");
                }
            }).catch((_) => { console.log('caught something') });
        } catch (error) {
            console.log("in sendmessage: " + error);
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
                    console.log("in ws.send: "+ err);
                    throw new Error("Error in ws.send(...)");
                }
            }).catch((_) => { console.log('caught something') });
        } catch (error) {
            console.log("in sendOrder: " + error);
            throw new Error('Error sending WS event.');   
        } 
    }
}