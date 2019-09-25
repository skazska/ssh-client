const { createInterface, emitKeypressEvents } = require('readline');
const EventEmitter = require('events');

const { CommandController } = require('./command-controller');
const { KeyStream } = require('./key-stream');
const printUptime = require('./print-uptime');
const { transferFile }= require('./transfer-file');

function completer(line, callback) {
    //ask

    const completions = '.help .error .exit .quit .q'.split(' ');
    const hits = completions.filter((c) => c.startsWith(line));
    // show all completions if none found

    callback(null, [hits.length ? hits : completions, line]);
}



class Controller extends EventEmitter {
    /**
     *
     * @param {{client: ssh2.Client}} props
     */
    constructor (props) {
        super();
        this.client = props.client;
        this.inStream = null;
        this.outStream = null;
        this.sshStream = null;
        this.rl = null;
    }

    /**
     *
     * @param line
     */
    dispatchTextCommand (line) {
        // console.log('textCommand', line);
        let cmd = line.substr(0, line.indexOf(" ")) || line;
        switch (cmd) {
            case 'get':
            case 'put':
                let [cmd, pathFrom, pathTo] = line.split(' ');
                if (pathFrom) {
                    transferFile(cmd, this.client, pathFrom, pathTo).then(
                        (result) => { console.info('file ' + pathFrom + ' have been ' + cmd); },
                        (err) => { console.error(err); }
                    );
                } else {
                    throw new Error('local file path is not provided');
                }
                break;
            default:
                //this.sshStream.write(line + '\n', 'utf-8');
                // this.sshStream.write(line + '\n', 'ascii');

                // this.client.exec(line, {tty: true}, (err, stream) => {
                //     stream.pipe(this.outStream);
                //     // stream.on('end')
                // });
        }
    }

    // dispatchKeyCommand (cmd) {
    //     console.log('keyCommand', cmd);
    //     switch (cmd) {
    //         case 'Tab':
    //             this.sshStream.write('\x09', 'ascii');
    //
    //             break;
    //         case 'CtrlC':
    //             this.sshStream.write('\x03', 'ascii');
    //
    //             break;
    //         default:
    //         // this.client.exec(line, {tty: true}, (err, stream) => {
    //         //     stream.pipe(this.outStream);
    //         //     // stream.on('end')
    //         // });
    //     }
    // }
    //

    /**
     * starts session
     * @param {ReadStream} inStream
     * @param {WriteStream} outStream
     * @returns {Controller}
     */
    shell (inStream, outStream) {
        this.inStream = inStream;
        this.outStream = outStream;

        this.client.shell((err, stream) => {
            if (err) throw err;

            stream
                .on('data', function(data) {
                    // console.log('OUTPUT: ' + data);
                })
                .on('close', () => {
                    console.log('Stream :: close');
                    this.client.end();
                    this.emit('exit');
                });


            this.sshStream = stream;

            const keyStream = new KeyStream(inStream);
            keyStream.pipe(stream).pipe(outStream);

            this.rl = createInterface({
                input: keyStream,
                // output: outStream,
                terminal: false,
                // completer: completer
            }).on('line', this.dispatchTextCommand.bind(this));


        });

        return this;
    }

    /** prints uptime info */
    uptime () {
        return printUptime(this.client);
    }

}

module.exports = Controller;
