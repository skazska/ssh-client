const transferFile = require('./transfer-file');

/**
 * @module
 * @name commandDispatcher
 * @function
 * @param {ssh2.Client} client
 * @return {CommandDispatcher}
 */

/**
 * parses put/get command, and starts file transferring
 * @param {string} command - command
 * @param {ssh2.Client} client
 * @param text - full text to parse params
 * @returns {Promise<string>}
 */
function fileTransfer (command, client, text) {
    return new Promise(resolve => {
        let [cmd, pathFrom, pathTo] = text.split(' ');

        if (!pathTo) pathTo = pathFrom;

        console.info(command + ' file from ' + pathFrom + ' to ' + pathTo);
        if (pathFrom) {
            try {
                transferFile(command, client, pathFrom, pathTo).then(
                    (result) => {
                        console.info('file ' + pathFrom + ' have been ' + command + ' as ' + pathTo);
                        resolve('');
                    },
                    (err) => { resolve('file transfer error : ' + err.message); }
                );
            } catch (e) {
                console.info('error executing ' + text + ' : ' + e.message);
                resolve('');
            }
        } else {
            console.info('source file path is not provided');
            resolve('');
        }
    });
}

//command
const execs = {
    [':get']: fileTransfer.bind(null, 'get'),
    [':put']: fileTransfer.bind(null, 'put')
};

/**
 *
 */
class CommandDispatcher {
    /**
     * @param {ssh2.Client} client
     */
    constructor (client) {
        this.client = client;
    }

    /**
     * parses text and returns command text or false
     * @param {string} text
     * @returns {string|boolean}
     */
    identifyCommand(text) {
        let cmd = text.substr(0, text.indexOf(" ")) || text;
        if (cmd in execs) return cmd;
        return false;
    }

    /**
     * executes command
     * @param {string} cmd - command
     * @param {string} text - full text
     * @returns {*}
     */
    dispatchCommand (cmd, text) {
        return execs[cmd] && execs[cmd](this.client, text);
    }

    /**
     * checks if text should be treated as command
     * @param text
     * @returns {boolean}
     */
    matchCommand(text) {
        // for (let key in execs) {
        //     if (text.length > key.length && text.substr(0, key.length + 1) === (key + ' ')) return true;
        //     if (text.length <= key.length && key.substr(0, text.length) === text) return true;
        // }
        // return false;

        return text[0] === ':';
    }
}

module.exports = (client) => { return new CommandDispatcher(client); };
