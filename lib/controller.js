const EventEmitter = require('events');
const getCommandStream = require('./command-stream').get;
const getCommandDispatcher = require('./command-dispatcher').get;
const net = require('net');

/**
 * implements main app actions
 */
class Controller extends EventEmitter {
    /**
     * @param {{client: ssh2.Client}} props
     */
    constructor (props) {
        super();
        this.client = props.client;

        // shell entities
        this.shellStream = null;
        this.inStream = null;
        this.inStreamMode = null;
        this.outStream = null;
        this.commandStream = null;

        // port forwarding entities
        this.forwardDirectServers = {};
        this.forwardReverseBounds = {};
    }

    /**
     * cleans shell related controller resources
     */
    clearShell() {
        //shell
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

    /**
     * cleans all related resources
     */
    cleanup() {
        this.clearShell();

        const pendings = [];

        // clean direct forwards
        for (let key in this.forwardDirectServers) {
            pendings.push(new Promise(resolve => {
                this.forwardDirectServers[key].server.close(()=>{
                    delete this.forwardDirectServers[key];
                    resolve(true);
                });
            }));
        }

        // clean reverse forwards
        for (let key in this.forwardReverseBounds) {
            pendings.push(new Promise(resolve => {
                this.client.unforwardIn(this.forwardReverseBounds[key].addr, this.forwardReverseBounds[key].port, () => {
                    delete this.forwardReverseBounds[key];
                    resolve(true);
                });
            }));
        }

        return Promise.all(pendings).then(() => {
            this.emit('cleanedUp');
        });
    }

    /**
     * starts shell session, emmits shellExit on shell close
     * @param {ReadStream} inStream
     * @param {WriteStream} outStream
     * @returns {Controller}
     */
    shell (inStream, outStream) {
        // only one shell supported, wipe previous
        this.clearShell();

        // open shell connection
        this.client.shell((err, stream) => {
            if (err) throw err;

            this.shellStream = stream;
            this.inStream = inStream;
            this.outStream = outStream;

            stream.on('finish', () => {
                this.emit('shellExit');
            });

            // turn on raw mode to intercept command keys
            if (inStream.isTTY) {
                this.inStreamMode = inStream.isRaw;
                inStream.setRawMode(true);
            }

            // init command stream
            this.commandStream = getCommandStream(getCommandDispatcher(this.client), outStream);

            inStream.pipe(this.commandStream).pipe(stream).pipe(outStream);
        });
    }

    /**
     * starts direct tunnel
     * @param {Object} input
     * @param {string} input.bindAddr - address local server to listen
     * @param {number} input.bindPort - port local server to listen
     * @param {string} input.addr - address of remote server forwarding port
     * @param {number} input.port - port forwarded by remote server
     * @returns {Controller}
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
        server.on('close', () => {
            this.emit('portForwarding', 'stopped', bindAddr, bindPort);
            delete this.forwardDirectServers[bindAddr + ':' + bindPort];
        });

        server.listen({
            port: bindPort,
            host: bindAddr
        }, () => {
            this.emit('portForwarding', 'started', bindAddr, bindPort);
            // console.info('TCP Forward :: forwarding at', bindAddr, bindPort, 'to', addr, port);
        });

        this.forwardDirectServers[bindAddr + ':' + bindPort] = {server: server};

        return this;
    }

    /**
     * reverse forwarding incoming connection handler, calls accept if port is not bounded yet
     * @param {string} addr - remote addr
     * @param {number} port - remote port
     * @param {{destIP: string, destPort: number, srcIP: string, srcPort: number}} info
     * @param {function} accept - returns incoming connection stream
     * @param {function} reject - rejects incoming connection
     * @returns {*}
     */
    processIncomingConnection(addr, port, info, accept, reject) {
        const bound = this.forwardReverseBounds[info.destIP + ':' + info.destPort];

        if (!bound) {
            this.emit('reverseConnection', 'rejected', addr, port, info);
            // console.info('TCP  Reverse :: unexpected incoming connection');
            return reject();
        }

        const connection = new net.createConnection({ host: addr, port: port });
        const channel = accept();
        this.emit('reverseConnection', 'accepted', addr, port, info);

        channel.pipe(connection).pipe(channel);
    }

    /**
     * starts reverse tunnel
     * @param {Object} input
     * @param {string} input.bindAddr - address local server to listen
     * @param {number} input.bindPort - port local server to listen
     * @param {string} input.addr - address of remote server forwarding port
     * @param {number} input.port - port forwarded by remote server
     * @returns {Controller}
     */
    forwardReverse ({bindAddr, bindPort, addr, port}) {
        if (this.forwardReverseBounds[bindPort]) {
            console.error(
                new Error('port ' + bindPort + ' is bound by ' + this.forwardReverseBounds[bindPort].addr)
            );
            return this;
        }

        // bind handler
        const handler = this.processIncomingConnection.bind(this, addr, port);

        this.client.forwardIn(bindAddr, bindPort, (err, info) => {
            if (err) return console.error(err);
            this.forwardReverseBounds[bindAddr + ':' + bindPort] = {addr: bindAddr, port: bindPort};
            this.emit('portReverse', 'started', bindAddr, bindPort);
            // console.info('Requested for inward connections on ' + bindAddr + ' port ' + bindPort);
        });
        this.client.on('tcp connection', handler);

        return this;
    }
}

module.exports = {
    Controller: Controller
};
