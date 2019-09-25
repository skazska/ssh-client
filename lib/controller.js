const { createInterface } = require('readline');
const EventEmitter = require('events');

const printUptime = require('./print-uptime');
const sendFile = require('./send-file');

function completer(line, callback) {
    //ask

    const completions = '.help .error .exit .quit .q'.split(' ');
    const hits = completions.filter((c) => c.startsWith(line));
    // show all completions if none found

    callback([hits.length ? hits : completions, line]);
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
    }

    /**
     *
     * @param line
     */
    dispatchCommand (line) {
        let cmd = line.substr(0, line.indexOf(" ")) || line;
        switch (cmd) {
            case 'put':
                let [cmd, localPath, remotePath] = line.split(' ');
                if (localPath) {
                    sendFile(this.client, localPath, remotePath).then(
                        (result) => { console.info('file ' + localPath + ' have been sent'); },
                        (err) => { console.error(err); }
                    );
                } else {
                    throw new Error('local file path is not provided');
                }
                break;
            default:
                this.sshStream.write(line + '\n', 'utf-8');
                // this.client.exec(line, {tty: true}, (err, stream) => {
                //     stream.pipe(this.outStream);
                //     // stream.on('end')
                // });
        }
    }

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

            createInterface({
                input: inStream,
                // output: process.stdout,
                terminal: false,
                prompt: '>',
                completer: completer
            }).on('line', this.dispatchCommand.bind(this));

            stream.pipe(this.outStream);

        });

        return this;
    }

    /** prints uptime info */
    uptime () {
        return printUptime(this.client);
    }

}

module.exports = Controller;
