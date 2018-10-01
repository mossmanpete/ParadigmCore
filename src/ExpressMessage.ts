/*
  =========================
  ParadigmCore: Blind Star
  Message.ts @ {master}
  =========================

  @date_inital 19 August 2018
  @date_modified 24 September 2018
  @author Henry Harder

  Simple class for creating and sending JSON messages using ExpressJS.
*/

import * as exp from "express";

export class Message {
    private err: number;
    private msg: string;
    private json: object;
    private res: exp.Response;

    public static staticSendError(res: exp.Response, message: string, error: number): void {
        let json = {
            "error": error,
            "message": message,
            "processed": new Date().toLocaleString()
        }

        res.status(error).send(json);
    }

    public static staticSend(res: exp.Response, message: string): void {
        let json = {
            "message": message,
            "processed": new Date().toLocaleString()
        }

        res.status(200).send(json);
    }

    constructor (response: exp.Response, message: string, error: number) {
        if(error != null){
            this.err = error;
        } else {
            this.err = 200;
        }

        this.res = response;
        this.msg = message;
        this.json = this.toJSON();
    }

    public send(): void {
        this.res.status(this.err).send(this.json);
    }

    public toJSON(): object {
        if (this.err != 200){
            return {
                "error": this.err,
                "message": this.msg,
                "processed": new Date().toLocaleString()
            }
        } else {
            return {
                "message": this.msg,
                "processed": new Date().toLocaleString()
            }
        }
    }
}