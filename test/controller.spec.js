/* global describe, it */
require('mocha');
const {expect, use} = require('chai');
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
use(sinonChai);

const through2 = require('through2');
const { StringDecoder } = require('string_decoder');
// const split2 = require('split2');

const { DuplexMock, BufferReadableMock, BufferWritableMock } = require('stream-mock');
const {Controller} = require('../lib/controller');


const getFakeClient = (err, options) => {
    // const createShellStreamFake = sinon.fake.returns(shellStream);

    const shell = (cb) => {

        cb(err, options.shellStream);
    };

    const createReadStreamFake = sinon.fake.returns(options.readStream);
    const sftp = (cb) => {
        cb(err, {
            createReadStream: createReadStreamFake
        });
    };
    sftp.createReadStreamFake = createReadStreamFake;

    return {
        shell: shell,
        sftp: sftp
    }
};

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

        xit('basic test', (done) => {
            let shellStream = getShellStream(new StringDecoder('utf8'));

            const controller = new Controller({client: getFakeClient(null, {shellStream: shellStream})});

            const data = 'ls\nexit\n'.split('').map(str => str.charCodeAt(0));
            const inStream = new BufferReadableMock(Uint8Array.from(data));
            const outStream = new BufferWritableMock();

            controller.on('shellExit', () => {
                expect(Buffer.concat(shellStream.data).toString('utf-8')).equal('ls\nexit\n');
                expect(Buffer.concat(outStream.data).toString('utf-8')).equal('ls\nfile1\nfile2\nexit\n');

                done();
            });

            controller.shell(inStream, outStream);

        });

        it('custom commands', (done) => {
            let shellStream = getShellStream(new StringDecoder('utf8'));

            const controller = new Controller({client: getFakeClient(null, {
                shellStream: shellStream,
                readStream: new BufferReadableMock(['test', 'file', 'content'], {encoding: 'utf-8'})
            })});

            const data = 'ls\n:put file\nexit\n'.split('').map(str => str.charCodeAt(0));
            const inStream = new BufferReadableMock(Uint8Array.from(data));
            const outStream = new BufferWritableMock();

            controller.on('shellExit', () => {
                expect(Buffer.concat(shellStream.data).toString('utf-8')).equal('ls\n\nexit\n');
                expect(Buffer.concat(outStream.data).toString('utf-8')).equal('ls\nfile1\nfile2\nclient command\nexit\n');

                done();
            });

            controller.shell(inStream, outStream);

        });


    });



});
