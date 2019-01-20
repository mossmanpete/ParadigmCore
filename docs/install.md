---
title: Getting Started
---
# Install ParadigmCore

Follow this guide to download, configure, build, and run a full or validating OrderStream node.

If you want more detailed and complete instructions, follow [this tutorial](./tutorial.html) to set up a ParadigmCore instance, and join the current OrderStream test-network. 

## Setup Runtime

ParadigmCore uses the [`bigint`](https://github.com/tc39/proposal-bigint) primitive, a stage-three proposal slated for inclusion in the next ECMAScript specification. The spec has been integrated into [mainline v8](https://v8.dev/blog/bigint), and Node.JS [since v10.4](https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-06-06-version-1040-current-mylesborins).

This means that ___ParadigmCore requires [`node.js v10.4` or greater](https://github.com/nodejs/node/releases).___ 

TypeScript support for the `bigint` primitive was released with `tsc v3.2.2`, and the correct compiler version is specified in ParadigmCore's package file, so you won't need to update your global version (if present).

## Clone ParadigmCore

Clone the repository into a clean working directory via HTTP:

`git clone https://github.com/ParadigmFoundation/ParadigmCore`

or via SSH:

`git clone git@github.com:ParadigmFoundation/ParadigmCore`

## Setup Environment

___Don't execute `npm i` until you've read the next steps and configured your environment. If you do, it will fail.___

ParadigmCore is configured through it's runtime environment variables, which can be configured through a `.env` file places in the repositories root directory. To get started, you can copy a partially-filled template file included with the repo. To do so, execute the following in the ParadigmCore root (`/paradigmcore/`):
```bash
$ cp lib/template.env .env
```
_A blank template is also included at [`./lib/raw_template.env`](./lib/raw_template.env) for more granular control and custom configuration._

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

## [Join an existing network](/paradigmcore/tutorial)
_Note: more detailed instructions for joining a network, as well as hardware requirements for validators can be found [here](/paradigmcore/tutorial.md)._

If you intend to join an existing network as a full or validating node, you must also specify the following variable in your `.env` file:
```bash
SEEDS="" # with format "{NODE_ID}@{NODE_HOST}:26656[, ...]"
```

When joining an existing network (as a full or validating node), you will also need to obtain the `genesis.json` file that network was initialized with. Replace the auto-generated genesis file with the correct one for you network in `./lib/tendermint/config/genesis.json`.

You can skip this step, and leave `SEEDS` blank for development (single node) environments.

## Install Dependencies and Configure
ParadigmCore currently has a number of non-NPM dependencies, in addition to the deps specified in `package.json`, including `tendermint` and the Tendermint JavaScript driver that implements [the ABCI server.](https://tendermint.com/docs/spec/abci/client-server.html)

Conveniently, all dependencies, configuration, and validation can be run with a single:
``` bash
$ npm i # or yarn install
```

This will trigger a number of steps, including the execution of [`init.js`](./init.js) which downloads the correct tendermint binary, configures it's directories, generates node keys and network genesis files, and copies some required fields (including keys) to the environment file.

It also performs validation of the environment file and (tries) to provide helpful messages in the case of incomplete or incorrect configuration. You can run this script as many times as necessary – if validation fails the first time – after making changes to the `.env` file by running `npm i` again.

## Build and Run
This version is implemented in TypeScript, and all source files must be compiled with `tsc` before running to populate the executable JS files. By default, they will be placed in `./dist`. 

### Build from Source
Modify `tsconfig.json` to set the correct target and options for your environment, then run:
```bash
$ npm run build # to use tsconfig.json, or tsc [...args] for custom build
```
If you wish to build and run from one command, use:
```bash
$ npm run launch
```

### Run/Start
After configuring and validating your environment, start ParadigmCore with: 
```bash
$ npm run start
```

## Common Issues
ParadigmCore has a number of NPM dependencies which in turn depend on certain C++ compiler tool-chains and other common build tools. If not already installed on your machine, all necessary tools can be installed with (for Debain-base linux):

```bash
$ sudo apt-get update
$ sudo apt-get install build-essential
```
### Other Systems/Distributions
If you are using a Linux distribution that uses a different package manager, refer to [instructions specific to your distro.](https://www.garron.me/en/go2linux/gnu-gcc-development-tools-linux-fedora-arch-debian.html)

If you are using macOS, you will simply need to install [XCode](https://developer.apple.com/xcode/) command line tools. The required packages are usually packaged with XCode, but can also be [installed separately](http://osxdaily.com/2014/02/12/install-command-line-tools-mac-os-x/).

If you are on Windows, you can try [this NPM module](https://www.npmjs.com/package/windows-build-tools), but chances are you  already have them if you've done other types of development in the past.