---
title: Overview
---

# ParadigmCore

ParadigmCore is the reference implementation of the OrderStream (OS) network. To read more about OS network and the high-level functionality the software enables, check out the Paradigm Protocol [whitepaper.](https://paradigm.market/whitepaper) An introduction to the protocol as a whole can be found [here](/overview/intro.html). Additional documentation and tutorials will be published over the coming weeks and months.

ParadigmCore is built on [Tendermint](https://tendermint.com/), which it uses for networking and BFT consensus.

## Order books and storage
The OrderStream network design follows a partially-synchronous and event-driven architecture, with strong consistency guarantees provided by the underlying Tendermint consensus protocol. The network and client implementations are specifically designed for order message broadcast. As such, ParadigmCore does not include a database interface (by default) or offer query functionality for historical orders. Instead it provides a simple "event stream" that allows for applications to derive order books in real time that can be stored in an out-of-state database.

We have released one database driver so far, [`OrderStream-SRA`](https://github.com/ParadigmFoundation/OrderStream-SRA). It subscribes to a full or validating OrderStream node's WebSocket endpoint, and derives an order book of valid, executable [0x](https://0x.org) order messages. `OrderStream-SRA` serves this order book through a [0x Standard Relayer API](https://github.com/0xProject/standard-relayer-api) compliant interface. You can preview a live version of this software at [sra.zaidan.io/v2/](https://sra.zaidan.io/v2/). 

## Issues and proposals
ParadigmCore is under active development, and at this point should not be considered stable. If you find a bug, inconsistency, or vulnerability please open an [issue](https://github.com/paradigmfoundation/paradigmcore/issues).

If you encounter errors setting up or running setting up ParadigmCore, feel free to reach out on our chat server: https://chat.paradigm.market/

ParadigmCore is open source software, and we encourage the suggestion of improvements and enhancements to the protocol. If you have a suggestion or specification, please submit a [Paradigm Improvement Proposal](https://github.com/paradigmfoundation/pips) (PIP). 