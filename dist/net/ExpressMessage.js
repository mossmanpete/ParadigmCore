"use strict";
/*
  =========================
  ParadigmCore: Blind Star
  Message.ts @ {master}
  =========================

  @date_initial 19 August 2018
  @date_modified 19 October 2018
  @author Henry Harder

  Simple class for creating and sending JSON messages using ExpressJS.
*/
Object.defineProperty(exports, "__esModule", { value: true });
class Message {
    static staticSendError(res, message, error) {
        let json = {
            "error": error,
            "message": message,
            "processed": new Date().toLocaleString()
        };
        try {
            res.status(error).send(json);
        }
        catch (err) {
            console.log("sending express msg: " + err);
            throw new Error("Error sending Express message.");
        }
    }
    static staticSend(res, message) {
        let json = {
            "message": message,
            "processed": new Date().toLocaleString()
        };
        try {
            res.status(200).send(json);
        }
        catch (err) {
            console.log("sending express msg: " + err);
            throw new Error("Error sending Express message.");
        }
    }
    constructor(response, message, error) {
        if (error != null) {
            this.err = error;
        }
        else {
            this.err = 200;
        }
        this.res = response;
        this.msg = message;
        this.json = this.toJSON();
    }
    send() {
        try {
            this.res.status(this.err).send(this.json);
        }
        catch (err) {
            console.log("sending express msg: " + err);
            throw new Error("Error sending Express message.");
        }
    }
    toJSON() {
        if (this.err != 200) {
            return {
                "error": this.err,
                "message": this.msg,
                "processed": new Date().toLocaleString()
            };
        }
        else {
            return {
                "message": this.msg,
                "processed": new Date().toLocaleString()
            };
        }
    }
}
exports.Message = Message;
