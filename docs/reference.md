# Reference
A formal documentation site will be launched soon, alongside a developer portal with helpful resources and tutorials for building on Paradigm.

## Ethereum peg and shared-security model
See [`./spec/ethereum-peg.md`](./spec/ethereum-peg.md).

## Websocket API (valid order event stream)
See [`./docs/websocket-api.md`](./docs/websocket-api.md).

## HTTP API (propose an order)
This part will be expanded on soon. The primary interface endpoint (currently is) exposed as:
```
HTTP POST: localhost:4243
```
Where `BODY` is a JSON signed [Paradigm order](https://github.com/ParadigmFoundation/ParadigmConnect). This should be the primary point of contact with `ParadigmCore` for your application to post orders. The response from the server will tell you if the order was valid and accepted, and if so, the order hash (`OrderID`) that can be used to reference it.