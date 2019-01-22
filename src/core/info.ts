/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name info.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  21-January-2019
 * @date (modified) 21-January-2019
 *
 * ABCI info implementation.
*/

// custom typings
import { ResponseInfo } from "../typings/abci";

/**
 * Return information about the state and software.
 *
 * @param request {RequestInfo}    info request
 */
export function infoWrapper(state: State, version: string): (r) => ResponseInfo {
    return (request) => {
        return {
            data: "ParadigmCore (alpha)",
            lastBlockAppHash: state.lastBlockAppHash,
            lastBlockHeight: parseInt(state.lastBlockHeight.toString(), 10),
            version
        };
    };
}