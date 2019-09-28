const { Client } = require('ssh2');

const {connectionParams, forwardingParams} = require('./lib/connection-params');
const Controller = require('./lib/controller');
const argv = require('yargs-parser')(process.argv.slice(2));
const { timedMessage } = require('./lib/utils');

const conn = new Client();
const params = connectionParams(argv);

const forwarding = forwardingParams(argv);

const logInfo = console.info;
console.info = function(...args) {
    logInfo(timedMessage(...args));
};

console.info('connecting to ' + params.host);

conn
    .on('ready', function() {
        console.info('connected');
        const controller = new Controller({client: conn})
            .on('shellExit', () => {
                controller.cleanup();
            })
            .on('cleanedUp', () => {
                conn.end();
                process.exit(0);
            });

        if (forwarding.forward) {
            controller.forwardDirect(forwarding.forward);
        }

        if (forwarding.reverse) {
            controller.forwardReverse(forwarding.reverse);
        }

        controller.shell(process.stdin, process.stdout);
    })
    .connect(params);
