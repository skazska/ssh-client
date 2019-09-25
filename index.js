const { Client } = require('ssh2');

const connectionParams = require('./lib/connection-params');
const Controller = require('./lib/controller');

const argv = require('yargs-parser')(process.argv.slice(2));

const conn = new Client();

const params = connectionParams(argv);

console.info('connecting to ' + params.host);

conn
    .on('ready', function() {
        console.info('connected');
        const controller = new Controller({client: conn})
            .on('exit', () => {
                process.exit(0);
            });
        // controller.uptime();
        controller.shell(process.stdin, process.stdout);
    })
    .connect(params);
