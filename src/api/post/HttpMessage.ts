/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name HttpMessage.ts
 * @module src/api/post
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  19-August-2018
 * @date (modified) 03-December-2018
 *
 * Simple class for creating and sending JSON messages using ExpressJS.
 */

// Express.js webserver
import * as exp from "express";

/**
 * Represents response message for HTTP (post) API requests.
 */
export class HttpMessage {

    public static staticSendError(res: exp.Response, message: string, error: number): void {
        const json = {
            error,
            message,
            processed: new Date().toLocaleString(),
        };

        try {
            res.status(error).send(json);
        } catch (err) {
            throw new Error("error sending express message");
        }
    }

    public static staticSend(res: exp.Response, message: string): void {
        const json = {
            message,
            processed: new Date().toLocaleString(),
        };

        try {
            res.status(200).send(json);
        } catch (err) {
            throw new Error("error sending express message");
        }
    }

    /* End static methods. */

    private err: number;
    private msg: string;
    private json: object;
    private res: exp.Response;

    constructor(response: exp.Response, message: string, error: number) {
        if (error != null) {
            this.err = error;
        } else {
            this.err = 200;
        }

        this.res = response;
        this.msg = message;
        this.json = this.toJSON();
    }

    public send(): void {
        try {
            this.res.status(this.err).send(this.json);
        } catch (err) {
            throw new Error("error sending express message");
        }
    }

    public toJSON(): object {
        if (this.err !== 200) {
            return {
                error: this.err,
                message: this.msg,
                processed: new Date().toLocaleString(),
            };
        } else {
            return {
                message: this.msg,
                processed: new Date().toLocaleString(),
            };
        }
    }
}
