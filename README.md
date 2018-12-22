# ParadigmCore ([`v0.5.2-alpha`](https://github.com/ParadigmFoundation/ParadigmCore/pull/24))

ParadigmCore is the WIP reference implementation of the OrderStream (OS) network. To read more about OS network and the high-level functionality the software enables, check out the Paradigm Protocol [whitepaper,](https://paradigm.market/whitepaper) and the WIP [`docs`](./docs) folder. 

A description of the primary endpoint provided by an OrderStream node can be found at [`./docs/websocket-api.md`](./docs/websocket-api.md). An introduction to the protocol as a whole can be found [here](https://docs.paradigm.market/overview/introduction.html). Additional documentation and tutorials will be published over the coming months.

ParadigmCore is built on [Tendermint](https://tendermint.com/), which it uses for networking and BFT consensus.

### Order books and storage
The OrderStream network design follows a partially-synchronous and event-driven architecture, with strong consistency guarantees provided by the underlying Tendermint consensus protocol. The network and client implementations are specifically designed for order message broadcast. As such, ParadigmCore does not include a database interface (by default) or offer query functionality for historical orders. Instead it provides a simple "event stream" that allows for applications to derive order books in real time that can be stored in an out-of-state database.

We have released one database driver so far, [`OrderStream-SRA`](https://github.com/ParadigmFoundation/OrderStream-SRA). It subscribes to a full or validating OrderStream node's WebSocket endpoint, and derives an order book of valid, executable [0x](https://0x.org) order messages. `OrderStream-SRA` serves this order book through a [0x Standard Relayer API](https://github.com/0xProject/standard-relayer-api) compliant interface. You can preview a live version of this software at [https://sra.zaidan.io/v2/](https://sra.zaidan.io/v2/). 

### Troubleshooting
If you encounter issues setting up or running setting up ParadigmCore, feel free to reach out on our chat server: https://chat.paradigm.market/

ParadigmCore is under active development, and at this point should not be considered stable. If you find a bug, inconsistency, or vulnerability please open an [issue](https://github.com/paradigmfoundation/paradigmcore/issues).

## Usage

### Setup Runtime

ParadigmCore uses the [`bigint`](https://github.com/tc39/proposal-bigint) primitive, a stage-three proposal slated for inclusion in the next ECMAScript specification. The spec has been integrated into [mainline v8](https://v8.dev/blog/bigint), and Node.JS [since v10.4](https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-06-06-version-1040-current-mylesborins).

This means that ___ParadigmCore requires [`node.js v10.4` or greater](https://github.com/nodejs/node/releases).___ To ensure you have a compatible version, you can either run `node -v`, or check that the following _doesn't_ throw:
```bash
$ node
> let n = 1n
```

TypeScript support for the `bigint` primitive was released with `tsc v3.2.2`, and the correct compiler version is specified in ParadigmCore's package file, so you won't need to update your global version (if present).

### Clone ParadigmCore

Clone the repository into a clean working directory via HTTP:

`git clone https://github.com/ParadigmFoundation/ParadigmCore`

or SSH:

`git clone git@github.com:ParadigmFoundation/ParadigmCore`

### Setup Environment

___Don't run `npm i` until you've read the next steps and configured your environment.___

ParadigmCore is configured through it's runtime environment variables, which can be configured through a `.env` file places in the repo's root directory. To get started, you can copy a partially-filled template file included with the repo. Run the following in the ParadigmCore root:
```bash
cp lib/template.env .env
```
The [`template.env`](./lib/template.env) is nearly-complete with some sensible defaults, but you must set the following two variables before trying to configure and run ParadigmCore:
```bash
# set to 'full' to configure a non-validating node
NODE_TYPE="validator"

# set to 'production' if you are running in a network with >1 node
NODE_ENV="development" 

# you can use infura if you must, but a WS provider is required
WEB3_PROVIDER="ws://localhost:8546"
```
A local Ethereum node is recommended, but for development purposes the WebSocket endpoint provided by Infura will suffice.

If you use the `STAKE_CONTRACT_ADDR` set in the template, you must use a Ropsten provider. The Paradigm Protocol is not yet deployed on the main Ethereum network.

#### Joining an existing network
If you are setting up a full or validating node with the intention of joining an existing, running network, you must specify the following variable in your `.env` file:
```bash
SEEDS="" # with format "{NODE_ID}@{NODE_HOST}:26656[, ...]"
```

When joining an existing network (as a full or validating node), you will also need to obtain the `genesis.json` file that network was initialized with. Replace the auto-generated genesis file with the correct one for you network in `./lib/tendermint/config/genesis.json`.

#### Blank template

A blank template is also included at [`./lib/raw_template.env`](./lib/raw_template.env) for more granular control and fully-custom configuration.

### Install Dependencies and Configure
ParadigmCore currently has a number of non-NPM dependencies, in addition to the deps specified in `package.json`, including `tendermint` and the JavaScript driver that implements the ABCI server.

Conveniently, all dependencies, configuration, and validation can be run with a single:
``` bash
npm i # or yarn install
```

This will trigger a number of steps, including the execution of [`init.js`](./init.js) which downloads the correct tendermint binary, configures it's directories, generates node keys and network genesis files, and copies some required fields (including keys) to the environment file.

It also performs validation of the environment file and (tries) to provide helpful messages in the case of incomplete or incorrect configuration. You can run this script as many times as necessary – if validation fails the first time – after making changes to the `.env` file by running `npm i` again.

### Build
This version is implemented in TypeScript, and should be compiled before running to update the JS files in `./dist`. Modify `tsconfig.json` to set the correct target and options for your environment, then run:
```bash
npm run build # to use tsconfig.json, or tsc [...args] for custom build
```
If you wish to build and run from one command, use:
```bash
npm run launch
```

### Run
After configuring and validating your environment, start ParadigmCore with: 
```bash
npm run start
```

Alternatively, run the compiled startup script directly with:
```bash
node ./dist/index.js
```

## Reference 

### Ethereum peg and shared-security model
See [`./spec/ethereum-peg.md`](./spec/ethereum-peg.md).

### Websocket API (valid order event stream)
See [`./docs/websocket-api.md`](./docs/websocket-api.md).

### HTTP API (propose an order)
This part will be expanded on soon. The primary interface endpoint (currently is) exposed as:
```
HTTP POST: localhost:4243
```
Where `BODY` is a JSON signed [Paradigm order](https://github.com/ParadigmFoundation/ParadigmConnect). This should be the primary point of contact with `ParadigmCore` for your application to post orders. The response from the server will tell you if the order was valid and accepted, and if so, the order hash (`OrderID`) that can be used to reference it.

## Contributing

ParadigmCore is being developed as open-source software under a [GPL 3.0 License](./LICENSE). If you would like to get involved in the project, please feel free to do so by checking out the issues tab, creating issues, or forking the repository and making pull requests. We will be publishing formal contribution guidelines soon.

If you have any questions, please feel free to reach out to [Henry Harder](mailto:henry@paradigm.market) (GitHub @hrharder) the maintainer of this repository and project lead.
