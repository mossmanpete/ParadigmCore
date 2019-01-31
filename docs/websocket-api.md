---
title: Stream API
---

# OrderStream WebSocket API

The most fundamental piece of the OrderStream network is the event-based "order book". The primary way to subscribe to this event stream is via a node's WebSocket endpoint:
```
ws://localhost:4242/
```
If you are running a node, you can listen to the WS stream on localhost. Otherwise you must use a node that has exposed it's WebSocket endpoint to the public. For example, the public endpoint exposed by one the OrderStream nodes hosted by Paradigm:
```
wss://bs1.paradigm.market/stream
```
Note: you must use TLS (`wss://`) in order to listen to the stream of any Paradigm OrderStream node.

## Stream Format
All messages send by nodes use the same outer-level format. They are broadcast as stringified JSON over the Websocket protocol.

The first message upon successfully connecting to the endpoint indicates a successful websocket handshake. All subsequent messages (for now) will be of type "order" (`message.event === "order"`) of the following format:

```js
{
    "event": "order",
    "timestamp": 1537905576,
    "data-type": "JSON/string",
    "data": {
        "subContract": "0x...",
        "maker": "0x...",

        // ... the rest of the Order
    }    
}

// recover JS object with:
let eventObject = JSON.parse(message);
```
You can recover the order object client-side (node.js shown, can be adapted to browser) by subscribing to ParadigmCore's WebSocket endpoint (by default `localhost:4242`, but this should be proxied if used in production using a webserver that supports `WSS`):

```js
// incomplete snippet shown

let paradigm = new Paradigm({ /* config options */ });

ws.on("message", (msg) => { // msg is the string of above
    let eventObject = JSON.parse(msg);
    
    // ... do external stuff with the order data ...
    // You can also construct Paradigm Order objects:
    
    let orderObject = eventObject.data;
    let order = new paradigm.Order(orderObject)

    console.log(JSON.stringify(order)); // view the order

    // ... and then participate in trades via the OrderGateway:
    // (assuming the proper logic is implemented)

    order.take(taker, takerArguments);
});
