/* global describe, it */
require('mocha');
const {expect, use} = require('chai');
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
use(sinonChai);

const { BufferReadableMock, BufferWritableMock } = require('stream-mock')
const fs = require('fs');

const transferFile = require('../lib/transfer-file').transferFile;

const getFakeClient = (err, readStream, writeStream) => {
    const createWriteStreamFake = sinon.fake.returns(writeStream);
    const createReadStreamFake = sinon.fake.returns(readStream);

    const sftp = (cb) => {
        cb(err, {
            createWriteStream: createWriteStreamFake,
            createReadStream: createReadStreamFake
        });
    };

    sftp.createWriteStreamFake = createWriteStreamFake;
    sftp.createReadStreamFake = createReadStreamFake;

    return {
        sftp: sftp
    }
};

describe('transfer-file', () => {
    describe('get', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('relative from path', async () => {
            let readStream = new BufferReadableMock(['test', 'file', 'content'], {encoding: 'utf-8'});
            let client = getFakeClient(null, readStream);
            let fileStream = new BufferWritableMock(/*{emitClose: true}*/);
            const createWriteStreamFake = sinon.fake.returns(fileStream);
            sinon.stub(fs, 'createWriteStream').callsFake(createWriteStreamFake);

            await transferFile('get', client, 'test.file');

            expect(createWriteStreamFake).calledOnce;
            expect(createWriteStreamFake).calledWith(process.cwd() + '/test.file');
            expect(fileStream.data.map(buf => buf.toString('utf-8'))).eql(['test', 'file', 'content']);

            expect(client.sftp.createReadStreamFake).calledWith('test.file');
        });

        it('absolute from path', async () => {
            let readStream = new BufferReadableMock(['test', 'file', 'content'], {encoding: 'utf-8'});
            let client = getFakeClient(null, readStream);
            let fileStream = new BufferWritableMock({emitClose: true});
            const createWriteStreamFake = sinon.fake.returns(fileStream);
            sinon.stub(fs, 'createWriteStream').callsFake(createWriteStreamFake);

            await transferFile('get', client, '/some/test.file');

            expect(createWriteStreamFake).calledOnce;
            expect(createWriteStreamFake).calledWith('/some/test.file');
            expect(fileStream.data.map(buf => buf.toString('utf-8'))).eql(['test', 'file', 'content'])

            expect(client.sftp.createReadStreamFake).calledWith('/some/test.file');
        });

        it('to-path defined', async () => {
            let readStream = new BufferReadableMock(['test', 'file', 'content'], {encoding: 'utf-8'});
            let client = getFakeClient(null, readStream);
            let fileStream = new BufferWritableMock({emitClose: true});
            const createWriteStreamFake = sinon.fake.returns(fileStream);
            sinon.stub(fs, 'createWriteStream').callsFake(createWriteStreamFake);

            await transferFile('get', client, 'test.file', 'result.file');

            expect(createWriteStreamFake).calledOnce;
            expect(createWriteStreamFake).calledWith(process.cwd() + '/result.file');
            expect(fileStream.data.map(buf => buf.toString('utf-8'))).eql(['test', 'file', 'content']);

            expect(client.sftp.createReadStreamFake).calledWith('test.file');
        });

    });

    describe('put', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('relative from path', async () => {
            let fileStream = new BufferWritableMock({emitClose: true});
            let client = getFakeClient(null, null, fileStream);
            let readStream = new BufferReadableMock(['test', 'file', 'content'], {encoding: 'utf-8'});
            const createReadStreamFake = sinon.fake.returns(readStream);
            sinon.stub(fs, 'createReadStream').callsFake(createReadStreamFake);

            await transferFile('put', client, 'test.file');

            expect(createReadStreamFake).calledOnce;
            expect(createReadStreamFake).calledWith(process.cwd() + '/test.file');
            expect(fileStream.data.map(buf => buf.toString('utf-8'))).eql(['test', 'file', 'content']);

            expect(client.sftp.createWriteStreamFake).calledWith('test.file');
        });

        it('absolute from path', async () => {
            let fileStream = new BufferWritableMock({emitClose: true});
            let client = getFakeClient(null, null, fileStream);
            let readStream = new BufferReadableMock(['test', 'file', 'content'], {encoding: 'utf-8'});
            const createReadStreamFake = sinon.fake.returns(readStream);
            sinon.stub(fs, 'createReadStream').callsFake(createReadStreamFake);

            await transferFile('put', client, '/some/test.file');

            expect(createReadStreamFake).calledOnce;
            expect(createReadStreamFake).calledWith('/some/test.file');
            expect(fileStream.data.map(buf => buf.toString('utf-8'))).eql(['test', 'file', 'content']);

            expect(client.sftp.createWriteStreamFake).calledWith('/some/test.file');
        });

        it('to-path defined', async () => {
            let fileStream = new BufferWritableMock({emitClose: true});
            let client = getFakeClient(null, null, fileStream);
            let readStream = new BufferReadableMock(['test', 'file', 'content'], {encoding: 'utf-8'});
            const createReadStreamFake = sinon.fake.returns(readStream);
            sinon.stub(fs, 'createReadStream').callsFake(createReadStreamFake);

            await transferFile('put', client, 'test.file', 'result.file');

            expect(createReadStreamFake).calledOnce;
            expect(createReadStreamFake).calledWith(process.cwd() + '/test.file');
            expect(fileStream.data.map(buf => buf.toString('utf-8'))).eql(['test', 'file', 'content']);

            expect(client.sftp.createWriteStreamFake).calledWith('result.file');
        });

    });

});
