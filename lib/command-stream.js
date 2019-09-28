const through2 = require('through2');

const CLIENT_COMMAND_PROMPT = 'client command';

/**
 * @module
 * @name commandStream
 * @function
 * @param {CommandDispatcher} commandDispatcher
 * @param {Stream} outStream
 * @return {CommandDispatcher}
 */

/**
 * returns transform stream which:
 * identify command pattern in incoming stream by commandDispatcher
 * invokes command execution on commandDispatcher
 * writes data matching command pattern and command results to outStream, not passing to out pipeline
 * @summary
 * pass all input except commands, commands related input and commands output written to outStream
 * @param {CommandDispatcher} commandDispatcher
 * @param {Stream} outStream - aside output stream, to which to output commands and their output
 * @return {Stream}
 */
function commandStream(commandDispatcher, outStream) {
    // text matching command pattern
    let command = '';
    // flag indicates that input did not lose match
    let commandMatched = true;

    return through2.obj(function (chunk, enc, callback) {
        switch (chunk[0]) {
            case 10:
            case 13:
                // enter
                if (command) {
                    let cmd = commandDispatcher.identifyCommand(command);
                    if (cmd) {
                        // new line prompt in output stream
                        outStream.write('\n', 'utf-8');
                        // invoke command by commandDispatcher
                        commandDispatcher.dispatchCommand(cmd, command).then(result => {
                            // write result in output stream
                            if (result) outStream.write(result, 'utf-8');
                            // provoke new line prompt at remote (through out pipeline)
                            this.push(chunk);
                            callback()
                        });
                        // initial command state
                        command = '';
                        commandMatched = true;
                        // prevent common callback
                        return;
                    } else {
                        // if command not identified, pass to out
                        this.push(chunk);
                    }
                } else {
                    // if no command, pass to out
                    this.push(chunk);
                }

                // initial command state
                command = '';
                commandMatched = true;

                break;
            case 127:
                // backspace
                if (commandMatched) {
                    if (command.length > 1) {
                        // console.info(command);
                        command = command.substring(0, command.length - 1);
                        if (outStream.isTTY) {
                            outStream.moveCursor(-1, 0);
                            outStream.clearLine(1);
                        }
                    }
                    this.push('');
                } else {
                    this.push(chunk);
                }
                break;
            case 9:
                // tab
                if (commandMatched) {
                    if (outStream.isTTY) {
                        // ignore tab
                        outStream.cursorTo(CLIENT_COMMAND_PROMPT.length + command.length);
                        outStream.clearLine(1);

                        // TODO completer for commands? check for tab

                        this.push('');
                    }
                } else {
                    this.push(chunk);
                }
                break;
            default:
                if (commandMatched) {
                    const data = chunk.toString('utf-8');
                    if (data) {
                        // init local command input
                        if (data === ':' && !command && commandMatched) {
                            if (outStream.isTTY) {
                                outStream.cursorTo(0);
                                outStream.clearLine(1);
                            }
                            outStream.write(CLIENT_COMMAND_PROMPT, 'utf-8');
                        }
                        //check if command still match pattern
                        commandMatched = commandMatched && commandDispatcher.matchCommand(command + data);
                        if (!commandMatched) {
                            // match lost : send input to output pipeline and clear outStream
                            if (outStream.isTTY) {
                                outStream.moveCursor(-command.length, 0);
                                outStream.clearLine(1);
                            }
                            this.push(command + data);
                            command = '';
                        } else {
                            // append to command
                            command += data;
                            this.push('');
                            if (outStream.isTTY) {
                                outStream.write(data, 'utf-8');
                            }
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

module.exports = {
    get: commandStream
};
