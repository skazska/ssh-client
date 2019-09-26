const through2 = require('through2');

function commandStream(commandDispatcher, outStream) {
    let command = '';
    let commandMatched = true;
    return through2.obj(function (chunk, enc, callback) {
        switch (chunk[0]) {
            case 10:
            case 13:
                if (command) {
                    let cmd = commandDispatcher.identifyCommand(command);
                    if (cmd) {
                        outStream.write('\n', 'utf-8');
                        commandDispatcher.dispatchCommand(cmd, command).then(result => {
                            if (result) outStream.write(result, 'utf-8');
                            this.push(chunk);
                        });
                    } else {
                        // this.push(Buffer.concat([Buffer.from(command, "utf-8"), chunk]));
                        this.push(chunk);
                    }
                } else {
                    this.push(chunk);
                }
                command = '';
                commandMatched = true;

                break;
            case 127:
                if (commandMatched) {
                    if (command.length > 1) {
                        command = command.substring(0, command.length - 1);
                        outStream.moveCursor(-1, 0);
                        outStream.clearLine(1);
                    }
                    this.push('');
                } else {
                    this.push(chunk);
                }
                break;
            case 9:
                // TODO completer for commands? check for tab
            default:
                const data = chunk.toString('utf-8');
                if (commandMatched) {
                    if (data) {
                        if (data === ':' && !command && commandMatched) {
                            outStream.cursorTo(0);
                            outStream.clearLine(1);
                            outStream.write('client command', 'utf-8');
                        }
                        commandMatched = commandMatched && commandDispatcher.matchCommand(command + data);
                        if (!commandMatched) {
                            outStream.moveCursor(-command.length, 0);
                            outStream.clearLine(1);
                            this.push(command + data);
                            command = '';
                        } else {
                            command += data;
                            this.push('');
                            outStream.write(data, 'utf-8');
                        }
                    } else {
                        outStream.write(chunk);
                    }
                } else {
                    this.push(chunk);
                }
        }
        callback()
    });
}

module.exports = commandStream;
