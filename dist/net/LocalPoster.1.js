"use strict";
let client = require('axios');
const url_1 = require("url");
// ParadigmCore classes
const pc = require("../crypto/PayloadCipher").PayloadCipher;


let tx = {
    "type": "order",
    "data": {
        "subContract":"0x7ee5041e2872de709ee09f5d0f3897b2d81c6d85",
        "maker":"0x0e81f9f942059df957ef13a05e1a1056338d8913",
        "makerArguments":[],
        "takerArguments":[],
        "makerValues": {
            "valueA":322,
            "valueB":5334
        },
        "posterSignature": {
            "v":28,
            "r":"0x82cc052cd70a8b641f95f6bb32d26097c3d56d406720118ddb520106fb7c048c",
            "s":"0x1b064bf12cb2e92cc800f3696688a617418b549274637412736f256a836e4972"
        }
    }   
}

let str = pc.encodeFromObject(tx);

client({
    method: "post",
    url: "http://localhost:26657/",
    headers: {"Content-Type":"application/json"},
    data: {
        "method": "broadcast_tx_sync",
        "jsonrpc": "2.0",
        "params": [str],
        "id": "paradigmcore"
    }
}).then(r => console.log(r)).catch(e => console.log(e));