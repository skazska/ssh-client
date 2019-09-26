const { Client } = require('ssh2');

const connectionParams = require('./lib/connection-params');
const Controller = require('./lib/controller');
const argv = require('yargs-parser')(process.argv.slice(2));
const { timedMessage } = require('./lib/utils');

const conn = new Client();
const params = connectionParams(argv);

const logInfo = console.info;
console.info = function(...args) {
    logInfo(timedMessage(...args));
};

console.info('connecting to ' + params.host);

conn
    .on('ready', function() {
        console.info('connected');
        const controller = new Controller({client: conn})
            .on('exit', () => {
                process.exit(0);
            });
        controller.shell(process.stdin, process.stdout);
    })
    .connect(params);
