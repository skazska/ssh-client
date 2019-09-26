const { transferFile }= require('./transfer-file');

function fileTransfer (client, text) {
    return new Promise(resolve => {
        let [cmd, pathFrom, pathTo] = text.split(' ');
        if (!pathTo) pathTo = pathFrom;
        console.info(cmd + 'file from ' + pathFrom + ' to ' + pathTo);
        if (pathFrom) {
            try {
                transferFile(cmd, client, pathFrom, pathTo).then(
                    (result) => {
                        resolve('file ' + pathFrom + ' have been ' + cmd + ' as ' + pathTo);
                    },
                    (err) => { resolve('file transfer error : ' + err.message); }
                );
            } catch (e) {
                resolve('error executing ' + line + ' : ' + e.message);
            }
        } else {
            resolve('source file path is not provided');
        }
    });
}

const execs = {
    get: fileTransfer,
    put: fileTransfer
};

class CommandDispatcher {
    constructor (client) {
        this.client = client;
    }
    identifyCommand(text) {
        let cmd = text.substr(0, text.indexOf(" ")) || text;
        if (cmd in execs) return cmd;
        return false;
    }

    dispatchCommand (cmd, line) {
        return execs[cmd] && execs[cmd](this.client, line);
    }
}

module.exports = CommandDispatcher;
