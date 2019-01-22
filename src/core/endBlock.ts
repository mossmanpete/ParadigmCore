/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name endBlock.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  21-January-2019
 * @date (modified) 21-January-2019
 *
 * ABCI endBlock implementation.
*/

// custom types
import { ResponseEndBlock } from "../typings/abci";
import { bigIntReplacer } from "../util/static/bigIntUtils";
import { validatorUpdate } from "./util/valFunctions";

export function endBlockWrapper(state: State): (r) => ResponseEndBlock {
    return (r) => {
        // temporary
        console.log(`\n State at height ${r.height}:\n${JSON.stringify(state, bigIntReplacer)}\n`);
        return {
            validatorUpdates: []
        };
    };
}