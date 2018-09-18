# ParadigmCore

![Status](https://img.shields.io/badge/status-beta-orange.svg) ![Version](https://img.shields.io/badge/version-0.0.1-brightgreen.svg)
[![AUR](https://img.shields.io/aur/license/yaourt.svg)](./LICENSE) [![Chat Server](https://img.shields.io/badge/chat%20server-join!-red.svg)](https://chat.paradigm.market/)

## Introduction
ParadigmCore is the main package that enables the functionality of the OrderStream network. Every OrderStream node in the network must be running ParadigmCore. To read more about what the package does, check out the [intro](./lib/docs/intro.md) doc, and the Paradigm Protocol [whitepaper](https://paradigm.market/whitepaper).

ParadigmCore (`nodejs-os`) is the direct tendermint implementation of the OrderStream network node software. It is an [ABCI application](https://cosmos.network/docs/sdk/core/app4.html) intended to be used with the [Tendermint](https://github.com/tendermint/tendermint) state replication software. 

This version of ParadigmCore no longer uses BigchainDB, and does not include a database or query functionality for orders. It instead provides interfaces for common database solutions that can be used at the discretion of the node's host, depending on production environment. 

## Download and Install Dependencies

First, make sure you have recent versions of Node.js, NPM, and TypeScript installed.
You should then clone this repository into a clean working directory. Something like `$HOME/paradigmcore`:

`git clone https://github.com/ParadigmFoundation/ParadigmCore`

From there,  `cd paradigmcore` and install dependencies: `npm i`

## Build
This version is partially implemented in TypeScript, and should be compiled to update the JS files in `./dist`. Modify `tsconfig.json` to the correct target for your environment, then run:
```
npm run tsc OR tsc
```
You can just run `tsc` if the default `tsconfig.json` is used.

## Run
To run, you must have a tendermint node runing on the same machine on the expected port. With tendermint's binary installed, run:
```
tendermint node
```
Assuming you have already configured the node with `tendermint init`, this will listen on the ABCI port. Then, start ParadigmCore with:
```
npm run start OR node ./dist/index.js
```

## Contributing

ParadigmCore is being developed as open-source software under a [GPL 3.0 License](./LICENSE). If you would like to get involved in the project, please feel free to do so by checking out the issues tab, creating issues, or forking the repository and making pull requests. We will be publishing formal contribution guidlines soon.

If you have any questions, please feel free to reach out to [Henry Harder](mailto:henry@paradigm.market) (GitHub @hrharder) the maintaner of this repository and project lead.