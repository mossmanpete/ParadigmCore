---
title: Order TX Spec
---

# Transaction Type Specification (WIP)
Currently there is one type of broadcast transaction supported by `ParadigmConnect` and the OrderStream network: `OrderBroadcast.` This doc contains the current OrderBroadcast model, and proposes the model for StreamBroadcasts.

## `tx.type`: OrderBroadcast
A signed order broadcast transaction as received by an OrderStream validator via an HTTP POST request (fields marked `[O]` are optional, and required if marked `[R]`):
```js
{
    "maker":            "0x...", // [O] address string
    "subContract":      "0x...", // [R] address string
    "makerArguments":   [],      // [O] object array
    "takerArguments":   [],      // [O] object array
    "makerValues":      {},      // [R] object
    "takerValues":      {},      // [O] object
    "posterSignature":  {}       // [R] signature object 
}
```
To the ABCI state machine, the OrderBroadcast transaction is received as:
```js
{
    type:     "OrderBroadcast",     // string
    data:     {/* order tx */}      // Order object
}
```

## `tx.type`: StreamBroadcast (not implemented yet)
StreamBroadcast transactions are similar to OrderBroadcasts from a structural perspective. The difference is that instead of order data for contract logic, the data payload is arbitrary information about how to connect to a third party stream.

A signed StreamBroadcast transaction is received by an OrderStream validator node via an HTTP POST request:

```js
{
    "maker":            "0x...", // [O] address string
    "streamInfo":       {},       // [R] object
    "posterSignature":  {}       // [R] signature object 
}
```
The `streamInfo` object can contain arbitary key:value pairs with data necessary for clients to connect to the third party stream. No data structure should be enforced at for the `streamInfo` object by `ParadigmConnect.`

An example of a potential StreamBroadcast transaction:
```js
{
    "maker":        "0xC42E6EBAF1513e56d55c568ff2a9304aCA2BfD59",
    "streamInfo": {
        "protocol":     "wss",
        "port":         1212,
        "access":       "public",
        "URI":          "wss://mystreambroadcast.com:1212/stream",
        "notes":        "This stream is for WETH/ZRX orders"    
    },
    "posterSignature": {
        "v":    "...",
        "r":    "...",
        "s":    "...",
        "messageHex":   "..."
    }
}
```
To the ABCI state machine, the StreamBroadcast transaction is received as:
```js
{
    type:     "StreamBroadcast",     // string
    data:     {/* stream tx */}      // Stream object
}
```
