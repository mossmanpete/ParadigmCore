// tslint:disable

try {
    BigInt.prototype.toJSON = function() { return `${this.valueOf().toString()}n`; };
    BigInt.prototype.toNumber = function() { return parseInt(this.toString(), 10); };
    BigInt.fromString = function(str) { return BigInt(parseInt(str, 10)); };
} catch (error) {
    throw new Error("Failed to monkey-patch BigInt methods.");
}
