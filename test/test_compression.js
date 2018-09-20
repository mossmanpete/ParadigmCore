// Potential way to encode/compress orders for transport inside a URL 
// @date 20 Sept 2018

let zlib = require('zlib');

let testJSONstring = '{"subContract":"0x374805bbb424a220fe9774880fc4fabbef925912","makerValues":{"principalAmount":"1000000000000000000","expirationTimestampInSec":"1537910057","principalToken":"0x2e9ff9297c4d94e31492559f7c13ebc4003b2011","termsContract":"0xcdc99b9c5f3048b307315a9eacb8cbd57449dae4","termsContractParameters":"0x04000000000de0b6b3a76400000088b8300030100000001bc16d674ec8000000","kernelVersion":"0xf21ef0271ebcbd144616c43b90dc578665264a2c","issuanceVersion":"0x384cdafd4dddd1b7f9210534a16931e60809b658","debtor":"0xd2f45e02ab7b190ac9a87b743eab4c8f2ed0e491","debtorFee":"0","creditor":"0x0000000000000000000000000000000000000000","creditorFee":"0","relayer":"0x0000000000000000000000000000000000000000","relayerFee":"0","underwriter":"0x0000000000000000000000000000000000000000","underwriterFee":"0","underwriterRiskRating":"0","salt":"88816275993698372217","debtorSignature":{"v":28,"r":"0x28aa43731efc0d75f2f0890d887b1ec6359fc3ec99afc96f2b6f827208dd8ed9","s":"0x2e13b36a9c667c0aff6d88705d036f39a357a125860e04867aea1e24de88c074"},"creditorSignature":{"r":"","s":"","v":0},"underwriterSignature":{"r":"","s":"","v":0}}}';
let inBuffer = Buffer.from(testJSONstring, 'utf8');

console.log("\n=============\n");
console.log("INPUT_LENGTH: "+ inBuffer.length);
console.log("INPUT:\n\n"+ testJSONstring);
console.log("\n=============\n");

zlib.deflate(inBuffer, (_, res) => {

    console.log("COMPRESSED_LENGTH: "+res.toString('base64').length);
    console.log("COMPRESSED_RESULT:\n\n"+ res.toString('base64'));
    console.log("\n=============\n");

    zlib.inflate(Buffer.from(res.toString('base64'), 'base64'), (_, res) => {
        console.log("INPUT_LEN: " + inBuffer.length);
        console.log("DECOMPRESSED_LEN: "+ res.length);
        console.log("DECOMPRESSED_RESULT:\n\n"+ res.toString('utf8'));
        console.log("\n=============\n");
        console.log("\nEQUALITY_CHECK:");
        console.log("INPUT === DECOMPRESSED_RESULT: "+ (res.toString('utf8') === inBuffer.toString('utf8')));
        console.log("\n=============\n");
    });
});
