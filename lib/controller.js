const EventEmitter = require('events');
const { emitKeypressEvents } = require('readline');
const getCommandStream = require('./command-stream');
const CommandDispatcher = require('./command-dispatcher');
const net = require('net');

class Controller extends EventEmitter {
    /**
     *
     * @param {{client: ssh2.Client}} props
     */
    constructor (props) {
        super();
        this.client = props.client;
        this.shellStream = null;
        this.inStream = null;
        this.inStreamMode = null;
        this.outStream = null;
        this.commandStream = null;

        this.forwardDirectServer = [];
        this.forwardReverseBounds = {};
    }

    clearShell() {
        if (this.shellStream) {
            if (this.outStream) this.shellStream.unpipe(this.outStream);
            this.shellStream.end();
            this.outStream = null;
        }
        if (this.commandStream) {
            if (this.shellStream) this.commandStream.unpipe(this.shellStream);
            this.shellStream = null;
        }
        if (this.inStream) {
            if (this.commandStream) this.inStream.unpipe(this.commandStream);
            this.commandStream.end();
            this.commandStream = null;
            if (this.inStreamMode !== null) this.inStream.setRawMode(this.inStreamMode);
            this.inStream = null
        }

    }

    cleanup() {
        this.clearShell();

        this.forwardDirectServer.forEach((server) => { server.close(()=>{}); });
        this.forwardDirectServer = [];

        for (let port in this.forwardReverseBounds) {
            this.client.unforwardIn(this.forwardReverseBounds[port].addr, port, ()=>{

            });
        }
    }

    /**
     * starts session
     * @param {ReadStream} inStream
     * @param {WriteStream} outStream
     * @returns {Controller}
     */
    shell (inStream, outStream) {
        this.clearShell();
        this.client.shell((err, stream) => {
            if (err) throw err;

            this.shellStream = stream;
            this.inStream = inStream;
            this.outStream = outStream;

            stream.on('close', () => {
                console.log('Stream :: close');
                this.client.end();
                this.emit('exit');
            });

            emitKeypressEvents(inStream);
            if (inStream.isTTY) {
                this.inStreamMode = inStream.isRaw;
                inStream.setRawMode(true);
            }

            this.commandStream = getCommandStream(new CommandDispatcher(this.client), outStream);
            inStream.pipe(this.commandStream).pipe(stream).pipe(outStream);

            inStream.on('data', (d) => {
                // console.log(d);
            });
        });

        return this;
    }

    /**
     * starts direct tunnel
     * @param {string} bindAddr - address local server to listen
     * @param {number} bindPort - port local server to listen
     * @param {string} remoteAddr - address of remote server forwarding port
     * @param {number} remotePort - port forwarded by remote server
     */
    forwardDirect ({bindAddr, bindPort, addr, port}) {

        const server = net.createServer((c) => {
            this.client.forwardOut(bindAddr, bindPort, addr, port, (err, stream) => {
                if (err) {
                    console.error(err);
                    return c.end(err);
                }
                c.pipe(stream).pipe(c);
            });
        });
        server
            .on('error', (err) => {
                console.error(err);
            })
            .on('close', () => {
                console.info('TCP Forward :: CLOSED');
            });
        server.listen({
            port: bindPort,
            host: bindAddr
        }, () => {
            console.log('tcp server bound');
            console.dir(arguments);
        });

        this.forwardDirectServer.push(server);
    }

    processIncomingConnection(addr, port, info, accept, reject) {
        console.info('TCP :: INCOMING CONNECTION:', addr, port);
        console.dir(info);

        if (!this.forwardReverseBounds[info.destPort]) {
            console.info('TCP  Reverse :: unexpected incoming connection');
            return reject();
        }

        const channel = accept()
            .on('close', () => {
                console.info('TCP  Reverse channel:: CLOSED');
                connection.end();
            })
            .on('data', (data) => {
                console.info('TCP Reverse channel :: DATA: ' + data);
            });


        const connection = new net.createConnection({ host: addr, port: port }, () => {
            // 'connect' listener
            console.info('TCP  Reverse socket :: connected to server!');
        });
        connection.on('error', (error) => {

        });
        connection.on('data', (data) => {
            console.info('TCP  Reverse socket :: DATA'  + data);
        });
        connection.on('end', () => {
            console.info('TCP  Reverse socket :: DISCONNECTED');
        });

        this.forwardReverseBounds[info.destPort].connection = connection;

        channel.pipe(connection).pipe(channel);
    }

    forwardReverse ({bindAddr, bindPort, addr, port}) {
        if (this.forwardReverseBounds[bindPort]) {
            return console.error(
                new Error('port ' + bindPort + ' is bound by ' + this.forwardReverseBounds[bindPort].addr)
            );
        }
        const handler = this.processIncomingConnection.bind(this, addr, port);
        this.client.forwardIn(bindAddr, bindPort, (err, info) => {
            if (err) return console.error(err);
            this.forwardReverseBounds[bindPort] = {addr: bindAddr};
            console.info('Listening for connections on ' + bindAddr + ' port ' + bindPort);
        });
        this.client.on('tcp connection', handler);
    }
}

module.exports = Controller;
