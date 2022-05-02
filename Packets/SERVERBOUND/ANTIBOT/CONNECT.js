const { obfuscate } = require('javascript-obfuscator');

module.exports = function(server, socket, _data) {
    const randomInteger = (min, max) => { 
        let inBetween = (max - min) + 1; 
        let random = Math.floor(Math.random() * inBetween); 
        return max - random; // Returns max subtracted by random
    };

    const checks = ['constructor', 'window', 'document', 'document.body', 'document.head', 'document.createElement', 'navigator.userAgent.indexOf(\'HeadlessChrome\') !== -1']; 
    let integers = [];
    
    checks.forEach(_ => {
        integers.push(randomInteger(1, 1e10));
    });

    let evalStr = obfuscate(`let orgNum = 0;
    if (constructor) orgNum += ${integers[0]};
    if (window) orgNum += ${integers[1]};
    if (document) orgNum += ${integers[2]};
    if (document.body) orgNum += ${integers[3]};
    if (document.head) orgNum += ${integers[4]};
    if (document.createElement) orgNum += ${integers[5]}
    if (!(navigator.userAgent.indexOf('HeadlessChrome') !== -1)) orgNum += ${integers[6]}; orgNum;`, {
        compact: false,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        numbersToExpressions: true,
        simplify: true,
        shuffleStringArray: true,
        splitStrings: true,
        stringArrayThreshold: 1
    }).getObfuscatedCode();
    socket.challengeResult = integers.reduce((a, b) => a + b);

    server.packets.get('CLIENTBOUND')['JS_CHALLENGE'](socket, evalStr);
}