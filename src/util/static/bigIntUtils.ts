/**
 * ===========================
 * ParadigmCore: Blind Star
 * @name bigIntUtils.ts
 * @module src/util/static
 * ===========================
 *
 * @author Henry Harder
 * @date (initial)  05-November-2018
 * @date (modified) 15-November-2018
 *
 * A `JSON.stringify()` replacer function to support unique serialization of
 * BigInts.
 *
 * (subtle nod to TC39)
 */

export function bigIntReplacer(key: string, value: any): any {
    if (typeof(value) === "bigint") {
        // If value is BigInt, replace with custom string
        return `${value.toString()}n`;
    } else {
        // Otherwise, use default stringify behavior
        return value;
    }
}
