# ParadigmCore ("Blind Star" project)
ParadigmCore (`nodejs-os`) is the direct tendermint implementation of the OrderStream network node software. It is an [ABCI application](https://cosmos.network/docs/sdk/core/app4.html) intended to be used with the [Tendermint](https://github.com/tendermint/tendermint) state replication software. 

This version of ParadigmCore no longer uses BigchainDB, and does not include a database or query functionality for orders. It instead provides interfaces for common database solutions that can be used at the discretion of the node's host, depending on production environment. 

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