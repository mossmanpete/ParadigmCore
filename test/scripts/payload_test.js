"use strict";
// let _pc = require("../PayloadEncoder");
// tslint:disable
exports.__esModule = true;
var PayloadCipher_1 = require("../dist/crypto/PayloadCipher");
var pc = new PayloadCipher_1.PayloadCipher();
var testStr = '{"subContract":"0x8c4767dfd42e23d7602b2293a940ce49b554b27c","makerArguments":[{"dataType":"address","name":"creditor"},{"dataType":"address","name":"issuanceVersion"},{"dataType":"address","name":"debtor"},{"dataType":"address","name":"underwriter"},{"dataType":"address","name":"termsContract"},{"dataType":"address","name":"principalToken"},{"dataType":"address","name":"relayer"},{"dataType":"uint","name":"underwriterRiskRating"},{"dataType":"uint","name":"salt"},{"dataType":"uint","name":"principalAmount"},{"dataType":"uint","name":"underwriterFee"},{"dataType":"uint","name":"relayerFee"},{"dataType":"uint","name":"creditorFee"},{"dataType":"uint","name":"debtorFee"},{"dataType":"uint","name":"expirationTimestampInSec"},{"dataType":"bytes32","name":"termsContractParameters"},{"dataType":"signature","name":"debtorSignature"},{"dataType":"signature","name":"creditorSignature"},{"dataType":"signature","name":"underwriterSignature"}],"takerArguments":[{"dataType":"address","name":"creditor"}],"makerValues":{"principalAmount":"100000","expirationTimestampInSec":"1538166084","principalToken":"0xd0a1e359811322d97991e03f863a0c30c2cf029c","termsContract":"0x13763cf3eb3b6813fa800d4935725a0504c8eb8f","termsContractParameters":"0x040000000000000000000186a00088b8300030400000000000000000004e2000","kernelVersion":"0x755e131019e5ab3e213dc269a4020e3e82e06e20","issuanceVersion":"0x0688659d5e36896da7e5d44ebe3e10aa9d2c9968","debtor":"0xdae6a0e9e9032270dc88a8f6a6967c0321470bf3","debtorFee":"0","creditor":"0x0000000000000000000000000000000000000000","creditorFee":"0","relayer":"0x0000000000000000000000000000000000000000","relayerFee":"0","underwriter":"0x0000000000000000000000000000000000000000","underwriterFee":"0","underwriterRiskRating":"0","salt":"40150291750318955755","debtorSignature":{"v":27,"r":"0xc03ce6740b50023d86ae354bb9c5f3cdd8047c678d82d49876c0e0add871d9be","s":"0x6d7d145482d2ff38e04874e8f3a9d89e19a66644166dfe464d1ecfda8e6dc3e7"},"creditorSignature":{"r":"","s":"","v":0},"underwriterSignature":{"r":"","s":"","v":0}},"posterSignature":{"v":27,"r":"0x7217c77a60a5e9469b1da27606a03954b99063033b62e642aadbb3d73c103d95","s":"0x12acc5fea2f82bc63b21f76bd1c91112fe9e98eafdf8d520de1c3f469b941930"}}';
var testObj = {
    "subContract": "0x8c4767dfd42e23d7602b2293a940ce49b554b27c",
    "makerArguments": [
        { "dataType": "address", "name": "creditor" },
        { "dataType": "address", "name": "issuanceVersion" },
        { "dataType": "address", "name": "debtor" },
        { "dataType": "address", "name": "underwriter" },
        { "dataType": "address", "name": "termsContract" },
        { "dataType": "address", "name": "principalToken" },
        { "dataType": "address", "name": "relayer" },
        { "dataType": "uint", "name": "underwriterRiskRating" },
        { "dataType": "uint", "name": "salt" }, { "dataType": "uint", "name": "principalAmount" },
        { "dataType": "uint", "name": "underwriterFee" },
        { "dataType": "uint", "name": "relayerFee" },
        { "dataType": "uint", "name": "creditorFee" },
        { "dataType": "uint", "name": "debtorFee" },
        { "dataType": "uint", "name": "expirationTimestampInSec" },
        { "dataType": "bytes32", "name": "termsContractParameters" },
        { "dataType": "signature", "name": "debtorSignature" },
        { "dataType": "signature", "name": "creditorSignature" },
        { "dataType": "signature", "name": "underwriterSignature" }
    ],
    "takerArguments": [
        { "dataType": "address", "name": "creditor" }
    ],
    "makerValues": {
        "principalAmount": "100000",
        "expirationTimestampInSec": "1538166084",
        "principalToken": "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
        "termsContract": "0x13763cf3eb3b6813fa800d4935725a0504c8eb8f",
        "termsContractParameters": "0x040000000000000000000186a00088b8300030400000000000000000004e2000",
        "kernelVersion": "0x755e131019e5ab3e213dc269a4020e3e82e06e20",
        "issuanceVersion": "0x0688659d5e36896da7e5d44ebe3e10aa9d2c9968",
        "debtor": "0xdae6a0e9e9032270dc88a8f6a6967c0321470bf3",
        "debtorFee": "0",
        "creditor": "0x0000000000000000000000000000000000000000",
        "creditorFee": "0",
        "relayer": "0x0000000000000000000000000000000000000000",
        "relayerFee": "0",
        "underwriter": "0x0000000000000000000000000000000000000000",
        "underwriterFee": "0",
        "underwriterRiskRating": "0",
        "salt": "40150291750318955755",
        "debtorSignature": {
            "v": 27,
            "r": "0xc03ce6740b50023d86ae354bb9c5f3cdd8047c678d82d49876c0e0add871d9be",
            "s": "0x6d7d145482d2ff38e04874e8f3a9d89e19a66644166dfe464d1ecfda8e6dc3e7"
        },
        "creditorSignature": {
            "r": "",
            "s": "",
            "v": 0
        },
        "underwriterSignature": {
            "r": "",
            "s": "",
            "v": 0
        }
    },
    "posterSignature": {
        "v": 27,
        "r": "0x7217c77a60a5e9469b1da27606a03954b99063033b62e642aadbb3d73c103d95",
        "s": "0x12acc5fea2f82bc63b21f76bd1c91112fe9e98eafdf8d520de1c3f469b941930"
    }
};
function test() {
    encodeAndDecodeFromObject();
}
test();
function encodeAndDecodeFromObject() {
    console.log("====================\n");
    console.log("TESTING ENCODE FROM STRING\n");
    console.log(" - INPUT LENGTH: " + testStr.length + '\n');
    var encString = PayloadCipher_1.PayloadCipher.encodeFromObject(testObj);
    console.log(" - OUTPUT LENGTH: " + encString.length + '\n');
    console.log(" - OUTPUT:\n\n" + encString + '\n');
    console.log("==+// DECODING //===\n");
    console.log(" - IN BUFF LENGTH: " + encString.length + '\n');
    var decString = PayloadCipher_1.PayloadCipher.decodeToString(encString);
    console.log(" - DECODED:\n\n" + decString + '\n');
    console.log(" - EQUALITY CHECK (input === decompressed_output): " + (testStr === decString) + '\n');
    console.log("COMPRESSION RATIO: " + (testStr.length / encString.length).toFixed(3));
    console.log("====================\n");
}
