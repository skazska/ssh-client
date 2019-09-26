const EventEmitter = require('events');
const { KeyStream } = require('./key-stream');
const getCommandStream = require('./command-stream');
const printUptime = require('./print-uptime');
const CommandDispatcher = require('./command-dispatcher');

// function completer(line, callback) {
//     //ask
//
//     const completions = '.help .error .exit .quit .q'.split(' ');
//     const hits = completions.filter((c) => c.startsWith(line));
//     // show all completions if none found
//
//     callback(null, [hits.length ? hits : completions, line]);
// }



class Controller extends EventEmitter {
    /**
     *
     * @param {{client: ssh2.Client}} props
     */
    constructor (props) {
        super();
        this.client = props.client;
    }

    /**
     * starts session
     * @param {ReadStream} inStream
     * @param {WriteStream} outStream
     * @returns {Controller}
     */
    shell (inStream, outStream) {
        let debug = '';

        this.client.shell((err, stream) => {
            if (err) throw err;

            stream.on('close', () => {
                console.log('Stream :: close');
                this.client.end();
                this.emit('exit');
            });

            const keyStream = new KeyStream(inStream);
            const commandStream = getCommandStream(new CommandDispatcher(this.client));
            keyStream.pipe(stream).pipe(commandStream).pipe(outStream);

            keyStream.on('data', (d) => {
                debug = d;
            });
            keyStream.on('data', (d) => {
                debug = d;
            });

        });

        return this;
    }

    /** prints uptime info */
    uptime () {
        return printUptime(this.client);
    }

}

module.exports = Controller;
