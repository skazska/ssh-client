const { transferFile }= require('./transfer-file');

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

const execs = {
    [':get']: fileTransfer.bind(null, 'get'),
    [':put']: fileTransfer.bind(null, 'put')
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

    dispatchCommand (cmd, text) {
        return execs[cmd] && execs[cmd](this.client, text);
    }
    matchCommand(text) {
        // for (let key in execs) {
        //     if (text.length > key.length && text.substr(0, key.length + 1) === (key + ' ')) return true;
        //     if (text.length <= key.length && key.substr(0, text.length) === text) return true;
        // }
        return text[0] === ':';
        // return false;
    }
}

module.exports = CommandDispatcher;
