let comp = require('lzutf8');

function b2str(b){
    let out = []
    for(let i=0; i<b.length; i++){
        out.push(String.fromCharCode(b[i]))
    }
    return out.join('');
}

function str2b(str){
    let out = []
    for(let i=0; i<str.length; i++){
        out.push(str.charCodeAt(i));
    }
    return new Uint8Array(out);
}

let testJSONstring = '{"subContract":"0x374805bbb424a220fe9774880fc4fabbef925912","makerValues":{"principalAmount":"1000000000000000000","expirationTimestampInSec":"1537910057","principalToken":"0x2e9ff9297c4d94e31492559f7c13ebc4003b2011","termsContract":"0xcdc99b9c5f3048b307315a9eacb8cbd57449dae4","termsContractParameters":"0x04000000000de0b6b3a76400000088b8300030100000001bc16d674ec8000000","kernelVersion":"0xf21ef0271ebcbd144616c43b90dc578665264a2c","issuanceVersion":"0x384cdafd4dddd1b7f9210534a16931e60809b658","debtor":"0xd2f45e02ab7b190ac9a87b743eab4c8f2ed0e491","debtorFee":"0","creditor":"0x0000000000000000000000000000000000000000","creditorFee":"0","relayer":"0x0000000000000000000000000000000000000000","relayerFee":"0","underwriter":"0x0000000000000000000000000000000000000000","underwriterFee":"0","underwriterRiskRating":"0","salt":"88816275993698372217","debtorSignature":{"v":28,"r":"0x28aa43731efc0d75f2f0890d887b1ec6359fc3ec99afc96f2b6f827208dd8ed9","s":"0x2e13b36a9c667c0aff6d88705d036f39a357a125860e04867aea1e24de88c074"},"creditorSignature":{"r":"","s":"","v":0},"underwriterSignature":{"r":"","s":"","v":0}}}'
//console.log(testJSONstring.length)
let buffered = Buffer.from(str2b(testJSONstring)).toString('base64');
//console.log("BUFFERED: "+ buffered)
let unbuffered = Buffer.from(buffered, 'base64').toString('ascii');
//console.log("UNBUFFERED: "+ unbuffered);
let compressed = comp.compress(buffered);
let compstring = Buffer.from(compressed).toString('ascii');
console.log("COMPSTRING: "+ compstring.length)
//console.log(Buffer.from(str2b(testJSONstring)).toString('base64'))


//let bufferedCompArr = Buffer.from(b2str(compressedArr),s 'base64');
//console.log(bufferedCompArr.length);
//let unbufferedCompArr = Buffer.from(bufferedCompArr, 'base64')
//console.log(unbufferedCompArr.toString('base64'));
