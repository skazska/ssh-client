const EventEmitter = require('events');
const { emitKeypressEvents } = require('readline');
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
        this.client.shell((err, stream) => {
            if (err) throw err;

            stream.on('close', () => {
                console.log('Stream :: close');
                this.client.end();
                this.emit('exit');
            });

            emitKeypressEvents(inStream);
            if (inStream.isTTY) inStream.setRawMode(true);

            const commandStream = getCommandStream(new CommandDispatcher(this.client), outStream);
            inStream.pipe(commandStream).pipe(stream).pipe(outStream);

            inStream.on('data', (d) => {
                // console.log(d);
            });
        });

        return this;
    }

    forwardLocal () {

        this.client.forwardOut('192.168.100.102', 8000, '127.0.0.1', 80, function (err, stream) {
            if (err) throw err;
            stream.on('close', function () {
                console.log('TCP :: CLOSED');
                conn.end();
            }).on('data', function (data) {
                console.log('TCP :: DATA: ' + data);
            })
        })
    }

}

module.exports = Controller;
