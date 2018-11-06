"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Timestamp extends Date {
    constructor() {
        super();
    }
    logFormat() {
        return `${Math.floor(Date.now() / 1000).toString()}.${Date.now().toString().slice(-3)}`;
    }
}
exports.Timestamp = Timestamp;
