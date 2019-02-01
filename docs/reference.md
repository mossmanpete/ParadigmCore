---
title: Reference
---

# Reference
A formal documentation site will be launched soon, alongside a developer portal with helpful resources and tutorials for building on Paradigm.

## Ethereum peg and shared-security model
See [`./ethereum-peg.md`](./ethereum-peg-spec.md).

## Websocket API (valid order event stream)
See [`./websocket-api.md`](./websocket-api.md).

## Dynamic validator selection spec
See [`./validator-tx-spec.md`](./validator-tx-spec.md).

## HTTP API (propose an order to a validator)

This part will be expanded on soon. The primary interface endpoint (currently as of [`v0.7.0-rc3`](https://github.com/paradigmfoundation/paradigmcore) is exposed at:

```bash
http://localhost:4243/* # use application/JSON content header
```
Where `BODY` is a JSON signed [Paradigm order](https://github.com/ParadigmFoundation/ParadigmConnect). This should be the primary point of contact with `ParadigmCore` for your application to post orders. 

The response from the server will tell you if the order was valid and accepted, and if so, the order hash (`OrderID`) that can be used to reference it.