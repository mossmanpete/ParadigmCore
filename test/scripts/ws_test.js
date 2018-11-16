let WebSocket = require('ws');
let EventEmitter = require('events').EventEmitter;

let wss = new WebSocket.Server({ port:8080 });
let em = new EventEmitter()

wss.on('connection', (ws) => {
    em.on('validOrder', (order) => {
        console.log()
        ws.send(JSON.stringify(order));
        console.log('sent');
    });
});

function emitEvent(testOrder){
    em.emit('validOrder', {"data":testOrder});
}

setTimeout(emitEvent, 15000, "hello world");