/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name monkeyPatch.ts
 * @module src/util/static
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  05-November-2018
 * @date (modified) 05-November-2018
 *
 * Monkey-patch 'BigInt' object with custom functions.
 */

// tslint:disable

try {
    /**
     * Allows JSON.stringify(...) to be called on objects containing BigInt's.
     */
    BigInt.prototype.toJSON = function() { return `${this.valueOf().toString()}n`; };
    
    /**
     * Enables `1000 === 1000n.toNumber()` => "true"
     */
    BigInt.prototype.toNumber = function() { return parseInt(this.toString(), 10); };

    /**
     * Static constructor. Enables `let bigInt = BigInt.from('1000n')`
     */
    BigInt.fromString = function(str) { return BigInt(parseInt(str, 10)); };
} catch (error) {
    throw new Error("Failed to monkey-patch BigInt methods.");
}
