# ParadigmCore (alpha)

![Status](https://img.shields.io/badge/status-alpha-orange.svg) ![Version](https://img.shields.io/badge/version-0.4.1-brightgreen.svg)
[![AUR](https://img.shields.io/aur/license/yaourt.svg)](./LICENSE) [![Chat Server](https://img.shields.io/badge/chat%20server-join!-red.svg)](https://chat.paradigm.market/)

## Introduction
ParadigmCore is the main package that enables the functionality of the OrderStream network. Every OrderStream node in the network must be running ParadigmCore. To read more about the high-level functionality the package enables, check out the Paradigm Protocol [whitepaper,](https://paradigm.market/whitepaper) and the [WebSocket API](./docs/websocket-api.md) doc. More documentation will be published soon.

This version of ParadigmCore (`blind-star`) is the direct Tendermint implementation of the OrderStream network node software. It is an [ABCI application](https://cosmos.network/docs/sdk/core/app4.html) intended to be used with [Tendermint Core](https://github.com/tendermint/tendermint) BFT state replication and consensus.

#### Primary Endpoint
By default, valid orders are relayed via WebSocket to all connected parties. Below is the default endpoint (this should be proxied to public or used by local applications/middleware):
```
ws://localhost:4242/
```

#### A Note on Order Storage
The OrderStream network design follows an asynchronous and event-driven architecture, being specifically designed solely for order message broadcast. As such, ParadigmCore does not include a database (by default) or offer query functionality for historical orders. Instead it provides a simple interface that allows for applications to derive order books that can be stored in an out-of-state database.

We have released one database driver so far, `ParadigmMongo`, that allows you to store all valid orders (as relayed via ParadigmCore's WS endpoint) in a MongoDB backend server running on your node, or another machine. The repository for `ParadigmMongo` can be found [here](https://github.com/paradigmfoundation/paradigmmongo). You can preview a live version of this software at https://zaidan.io/. 

## Usage

### Download and Install Dependencies

First, make sure you have recent versions of Node.js, NPM, and TypeScript installed.
You should then clone this repository into a clean working directory. Something like `$HOME/paradigmcore`:

`git clone https://github.com/ParadigmFoundation/ParadigmCore`

From there, `cd paradigmcore` and install dependencies: `npm i`

#### Install Tendermint

ParadigmCore ships with a semi-custom helper library (found in `./lib/tendermint`) that is used to manage the Tendermint ABCI server and transaction transport, but also allows you to quickly install a recent Tendermint binary. The ParadigmCore manages the initialization and configuration of Tendermint Core, so there is no need to separately install, build, or run the binary. Download the binary by running:
```
npm run getTendermint
```
After running ParadigmCore for the first time (see below), there will be a new directory containing the chain data and validator private keys. This directory can be specified via your environment, but using the template environment will be placed at `~/.tendermint` (also known as `$HOME/.tendermint`).

### Build
This version is implemented in TypeScript, and should be compiled before running to update the JS files in `./dist`. Modify `tsconfig.json` to set the correct target and options for your environment, then run:
```
npm run build OR tsc
```
You can just run `tsc` if the default `tsconfig.json` is used.

### Configure
ParadigmCore is configured via it's runtime environment (your machine). You can provide configuration options via environment variables (recommended) or in a `.env` file which will be loaded into the Node.js runtime environment upon process startup (accessed internally using the global `process.env`).

There are several options that must be set before startup, including you validator private and public key (found in `{TENDERMINT_DIRECTORY}/config/priv_validator.json`, web3 provider, among other consensus parameters.

A sample configuration environment is included in [`./lib/other/.env.template`](./lib/other/.env.template). Although it shows which fields are required, it cannot be used without supplying your own Tendermint keypair. 

### Run
After configuring your environment, start ParadigmCore with: 
```
npm run start
```

Alternatively, run the compiled startup script directly with:
```
node ./dist/index.js
```

### Websocket API (valid order event stream)
See [`./docs/websocket-api.md`](./docs/websocket-api.md).

### HTTP API (propose an order)
This part will be expanded on soon. The primary interface endpoint (currently is) exposed as:
```
HTTP POST: localhost:4243
```
Where `request.body` is a JSON Paradigm order. This should be the primary point of contact with `ParadigmCore` for your application to post orders. The response from the server will tell you if the order was valid and accepted, and if so, the order hash (`OrderID`) that can be used to reference it.

## Contributing

ParadigmCore is being developed as open-source software under a [GPL 3.0 License](./LICENSE). If you would like to get involved in the project, please feel free to do so by checking out the issues tab, creating issues, or forking the repository and making pull requests. We will be publishing formal contribution guidelines soon.

If you have any questions, please feel free to reach out to [Henry Harder](mailto:henry@paradigm.market) (GitHub @hrharder) the maintainer of this repository and project lead.
