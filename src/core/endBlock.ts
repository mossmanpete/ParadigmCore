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

export function endBlockWrapper(state: State): (r) => ResponseEndBlock {
    return (r) => {
        // temporary
        console.log(`\n Congrats, you made it to the end of block ${r.height}\n`);
        return {
            validatorUpdates: []
        };
    };
}