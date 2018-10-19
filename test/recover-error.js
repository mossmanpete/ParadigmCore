// let _paradigmjs = require('paradigm.js');
let _paradigmconnect = require('paradigm-connect');

// let paradigmjs = new _paradigmjs();
let paradigmconnect = new _paradigmconnect();

// this order was signed with account 0xA5C2f261206E70d77D94747719641FFA618e5aB2
let orderObject = {"subContract":"0x7ee5041e287ede709ee09f5d0f3897b2d81c6d85","maker":"0x0e81f9f942059df957ef13a05e1a1056338d8913","makerArguments":[],"takerArguments":[],"makerValues":{"valueA":67461,"valueB":43046},"posterSignature":{"v":28,"r":"0x82cc052cd70a8b641f95f6bb32d26097c3d56d406720118ddb520106fb7c048c","s":"0x1b064bf12cb2e92cc800f3696688a617418b549274637412736f256a836e4972"}}

// create order with paradigm.js
// let pjsOrder = new paradigmjs.Order(orderObject);

// create order with paradigm-connect
let pcOrder = new paradigmconnect.Order(orderObject);

// recover with paradigm.js
// console.log(`pjsOrder.recoverPoster()   => outputs: ${pjsOrder.recoverPoster()}`);

// recover with paradigm-connect
console.log(`pcOrder.recoverPoster()    => outputs: ${pcOrder.recoverPoster()}`);