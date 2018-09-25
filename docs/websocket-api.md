# OrderStream WebSocket API
One of the most fundemental pieces of the OrderStream network is the event-based orderbook. The primary way to subscribe to this event stream is via a node's WebSocket endpoint:
```
ws://localhost:8080/
```
If you are running a node, you can listen to the WS stream on localhost. Otherwise you must use a node that has expose it's WebSocket endpoint to the public. For example, the public Paradigm endpoint:
```
ws://osd.paradigm.market/api/stream
```
## Stream Format

The first message upon connecting to the endpoint is a string with a message, but all others strings that are sent like:
```js
ws.send(JSON.stringify(order.toJSON()))
```
Raw messages will be strings, but calling `JSON.parse(msg)` will return objects like this:

```json
{
    "event": "new-order",
    "timestamp": 1537905576,
    "data": {
        "subContract": "0x...",
        "maker": "0x...",

        // ... the rest of the Order
    }    
}
```
You can recover the order object client-side (node.js shown, can be adapted to browser):
```js
let paradigm = new Paradigm();

ws.on("message", (msg) => { // msg is the string of above
    let eventObject = JSON.parse(msg);
    
    // ... do external stuff with the order data ...
    // You can also contstruct Paradigm Order objects:
    
    let orderObject = eventObject.data;
    let order = new paradigm.Order(orderObject)

    console.log(JSON.stringify(order)); // view the order

    // ... and then participate in trades via the OrderGateway:

    order.take(taker, takerArguments);
});