const websocket = require('ws');
let lotion = require('lotion');
let p = require('paradigm.js');
let paradigm = new p();

let wss = new websocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    ws.send("Hello, world!");
    ws.on("message", (msg) => {
        console.log(msg);
    });
});

let app = lotion({
    initialState: {
        count: 0
    }
});

app.use((state, tx) => {
    let newOrder = new paradigm.Order(tx);
    if(newOrder.recoverMaker() === newOrder.maker){
        state.count++;
        console.log("valid");
    } else {
        console.log("invalid");
        return { code: 1, log: "testlog"}
    }
});

app.listen(3000);