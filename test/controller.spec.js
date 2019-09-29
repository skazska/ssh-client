/* global describe, it */
require('mocha');
const {expect, use} = require('chai');
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
use(sinonChai);

const through2 = require('through2');
const { StringDecoder } = require('string_decoder');
const net = require('net');

const { DuplexMock, BufferReadableMock, BufferWritableMock } = require('stream-mock');
const {Controller} = require('../lib/controller');

// fake ssh client
const getFakeClient = (err, options) => {
    // const createShellStreamFake = sinon.fake.returns(shellStream);

    // open shell
    const shell = (cb) => {

        cb(err, options.shellStream);
    };

    // sftp
    const createReadStreamFake = sinon.fake.returns(options.readStream);
    const sftp = (cb) => {
        cb(err, {
            createReadStream: createReadStreamFake
        });
    };
    sftp.createReadStreamFake = createReadStreamFake;

    // port forward
    const forwardOut = (bindAddr, bindPort, addr, port, cb) => {
        cb(err, options.forwardStream);
    };

    // reverse port forward
    const forwardIn = (bindAddr, bindPort, cb) => {
        cb(err, bindAddr, bindPort);
    };
    const unforwardIn = (bindAddr, bindPort, cb) => {
        cb(err, bindAddr, bindPort);
    };



    return {
        shell: shell,
        sftp: sftp,
        forwardOut: forwardOut,
        forwardIn: forwardIn,
        unforwardIn: unforwardIn,
        on: (evtName) => { setTimeout(options.eventHandler.bind(null, evtName), 10); }
    }
};

// returns shell stream emulator
const getShellStream = (decoder) => {
    const stream = through2.obj(function (chunk, enc, callback) {
        this.data.push(chunk);
        const data = decoder ? decoder.write(chunk) : chunk;
        if (data === '\n') {
            this.push(chunk);
            switch (this.string) {
                case 'ls':
                    this.push('file1\nfile2\n');
                    this.string = '';
                    return callback();
                case 'exit':
                    this.end();
                    return callback();
                case '':
                    return callback();
                default:
                    this.push('command not found\n');
                    this.string = '';
                    return callback();
            }
        }
        this.string += chunk;
        this.push(chunk);
        callback();
    });
    stream.string = '';
    stream.data = [];
    return stream;
};

describe('controller', () => {
    describe('shell', () => {
        it('basic test', (done) => {
            // shell channel emulator
            let shellStream = getShellStream(new StringDecoder('utf8'));

            const controller = new Controller({client: getFakeClient(null, {shellStream: shellStream})});

            // emulate data flow from stdin
            const data = 'ls\nexit\n'.split('').map(str => str.charCodeAt(0));
            const inStream = new BufferReadableMock(Uint8Array.from(data));

            // accumulate output data like stdout
            const outStream = new BufferWritableMock();

            // check
            controller.on('shellExit', () => {
                // data written to ssh shell channel
                expect(Buffer.concat(shellStream.data).toString('utf-8')).equal('ls\nexit\n');
                // data pass to out stream from ssh channel
                expect(Buffer.concat(outStream.data).toString('utf-8')).equal('ls\nfile1\nfile2\nexit\n');

                done();
            });

            // open shell
            controller.shell(inStream, outStream);
        });

        it('custom commands', (done) => {
            // shell channel emulator
            let shellStream = getShellStream(new StringDecoder('utf8'));

            // init controller
            const controller = new Controller({client: getFakeClient(null, {
                shellStream: shellStream,
                readStream: new BufferReadableMock(['test', 'file', 'content'], {encoding: 'utf-8'})
            })});

            // data from input steam
            const data = 'ls\n:get file\nexit\n'.split('').map(str => str.charCodeAt(0));
            const inStream = new BufferReadableMock(Uint8Array.from(data));

            // result data steam collector
            const outStream = new BufferWritableMock();

            // check
            controller.on('shellExit', () => {
                // shell stream did not received custom client command
                expect(Buffer.concat(shellStream.data).toString('utf-8')).equal('ls\n\nexit\n');

                // `client command` - in output
                expect(Buffer.concat(outStream.data).toString('utf-8')).equal('ls\nfile1\nfile2\nclient command\n\nexit\n');

                done();
            });

            // open shell
            controller.shell(inStream, outStream);
        });
    });

    describe('forward', () => {
        it('basic test', (done) => {
            // flag that forward server stopped gracefully
            let serverStopped = false;
            // shell stream receive emulate returning response from remote through ssh tunnel
            const shellStream = through2((chunk, enc, callback) => {
                // response - send back request
                shellStream.data.push(chunk);
                callback(null, chunk);
            });
            shellStream.data = [];

            // conntoller
            const controller = new Controller({client: getFakeClient(null, {
                forwardStream: shellStream
            })});

            // start redirect
            controller.forwardDirect({bindAddr: '127.0.0.1', bindPort: 8888, addr: '127.0.0.1', port: 8889});

            // redirection registered
            expect(controller.forwardDirectServers['127.0.0.1:' + 8888]).exist;

            // redirection initiated
            controller.on('portForwarding', (state) => {
                if (state === 'started') {
                    // connect to binded addr:port
                    const connection = new net.createConnection(8888, '127.0.0.1', () => {
                        // send request
                        connection.write('something');
                        connection.end();
                    });

                    // collect result from connection
                    const resultStream = new BufferWritableMock();
                    connection.pipe(resultStream);

                    // remote finished response - check
                    shellStream.on('finish', () => {
                        // shell collected response
                        expect(shellStream.data.map(buf => buf.toString('utf-8'))).eql(['something']);
                    });

                    // connection received response from tunnel
                    resultStream.on('finish', () => {
                        // check
                        expect(resultStream.data.map(buf => buf.toString('utf-8'))).eql(['something']);
                        // check cleanup
                        controller.cleanup();
                    });

                } else if (state === 'stopped') {
                    serverStopped = true;
                }
            });

            controller.on('cleanedUp', () => {
                // no registered forwards after cleanup
                expect(controller.forwardDirectServers).eql({});
                // server stopped
                expect(serverStopped).equal(true);
                done();
            });

        })
    });

    describe('backward', () => {
        it('forwardReverse', (done) => {
            let  controller;

            // ssh channel stream sends incoming data, receives response
            const channelStream = new DuplexMock(['request']);

            // 'incoming connection' emulator
            const eventHandler = (evtName) => {
                controller.processIncomingConnection(
                    '127.0.0.1',
                    8889,
                    { destIP: '127.0.0.1', destPort: 8888, srcIP: '127.0.0.2', srcPort: 8889 },
                    () => { return channelStream; },
                    () => {}
                );
            };

            // 'remote server should be ready'
            const server = net.createServer((c) => {
                c.on('end', () => {
                    console.log('client disconnected');
                });
                // responses with request
                c.pipe(c);
            });
            server.listen({
                port: 8889,
                host: '127.0.0.1'
            }, () => {

                // controller
                controller = new Controller({client: getFakeClient(null, { eventHandler: eventHandler })});

                controller.on('portReverse', (state, addr, port) => {
                    // reverse port forwarding started
                    expect(controller.forwardReverseBounds['127.0.0.1:' + 8888]).exist;
                    expect(addr).equal('127.0.0.1');
                    expect(port).equal(8888);
                });

                // start reverse port frowarding
                controller.forwardReverse({bindAddr: '127.0.0.1', bindPort: 8888, addr: '127.0.0.1', port: 8889});

                channelStream.on('finish', () => {
                    // ssh channel (remote) received data - check
                    expect(channelStream.data.map(buf => buf.toString('utf-8'))).eql(['request']);
                    // cleanup
                    controller.cleanup();
                });

                controller.on('cleanedUp', () => {
                    expect(controller.forwardReverseBounds).eql({});
                    server.close(done);
                });

            });
        })
    });

});
