/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name endBlock.ts
 * @module src/core
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  21-January-2019
 * @date (modified) 22-January-2019
 *
 * ABCI endBlock implementation.
*/

// custom types
import { ResponseEndBlock } from "../typings/abci";
import { bigIntReplacer } from "../util/static/bigIntUtils";
import { validatorUpdate, doForEachValidator } from "./util/valFunctions";

export function endBlockWrapper(state: State): (r) => ResponseEndBlock {
    return (request) => {
        /**
         * Implementation idea:
         * 
         * Iterate over `state.validators` object, check for any validators 
         * where `state.validators[id].applied === false`, in that iteration, 
         * sum the total balance of all validators. If there is an un-applied
         * validator, iterate again and compute proportional power, then
         * apply validator updates to all validators.
         * 
         * Problem here is that genesis validators have no notion of balance, 
         * thus impossible to compute "proportional" power. I see a few possible
         * options.
         * 
         * 1. Upon the first non-genesis validator, remove all validators who
         *    were in the genesis set. This is probably a bad idea. 
         * 
         * 2. Hard-code a power of 10 (or another number) for validators where
         *    `state.validators[id].genesis === true`. This might work in test-
         *     ing, but is probably a bad idea for a main-net deployment.
         * 
         * 3. ???
        **/

        // begin example implementation

        const validatorUpdates = [];    // validator updates to apply
        let totalStake = BigInt(0);     // total at stake
        let needToUpdate = false;       // true if any new validators added

        doForEachValidator(state, (nodeId) => {
            // current validator
            const validator = state.validators[nodeId];

            // add balance to total for non genesis validators
            if (!validator.genesis) totalStake += validator.balance;

            // need to recompute power if any new validator is present
            if (!validator.applied) needToUpdate = true;
        });

        // return validator updates, if any
        return { validatorUpdates: [] };
    };
}