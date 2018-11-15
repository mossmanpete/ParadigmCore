"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Paradigm = require("paradigm-connect");
const Order = new Paradigm().Order;
function checkStream(tx, state) {
    return 0;
}
exports.checkStream = checkStream;
function deliverStream(tx, state, tracker) {
    return 0;
}
exports.deliverStream = deliverStream;
