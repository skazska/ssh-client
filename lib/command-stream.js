const through2 = require('through2');
const {timedMessage} = require('./utils');

function commandStream(commandDispatcher) {
    let command = '';
    let commandInProcess = null;
    // let chunks = [];
    // const push = (stream) => {
    //     stream.push(Buffer.concat(chunks));
    //     chunks = [];
    // };

    return through2.obj(function (chunk, enc, callback) {
        if (chunk.length <= 2 && command) {
            const hexData = chunk.toString('HEX');
            if (hexData === '0d0a') {
                this.push(chunk);
                let cmd = commandDispatcher.identifyCommand(command);
                if (cmd) {
                    commandInProcess = commandDispatcher.dispatchCommand(cmd, command);
                }
                command = '';
            } else {
                // some other 2byte sequence
                if (!chunk.toString('utf-8')) console.info(hexData);
                this.push(chunk);
            }
        } else {
            const data = chunk.toString('utf-8');
            if (commandInProcess) {
                commandInProcess.then(result => {
                    this.push(commandInProcess ? timedMessage(result, '\r\n') : chunk);
                    commandInProcess = null;
                });
            } else {
                if (chunk.length === 1) command += data;
                this.push(chunk);
            }
        }
        callback()
    });
}

module.exports = commandStream;
