/* global describe, it */
require('mocha');
const {expect, use} = require('chai');
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
use(sinonChai);

const getCommandStream = require('../lib/command-stream').get;
const getCommandDispatcher = require('../lib/command-dispatcher').get;

// const through2 = require('through2');
const { BufferReadableMock, BufferWritableMock } = require('stream-mock');

describe('command-stream', () => {
   let dispatcher;
   let dispatchCommandFake = sinon.fake.resolves('done');

   beforeEach(() => {
      dispatcher = getCommandDispatcher();
      sinon.stub(dispatcher, 'dispatchCommand').callsFake(dispatchCommandFake);
   });

   afterEach(() => {
      sinon.restore;
   });

   it('passes text not starting with :put or :get followed by enter', (done) => {
      let data = 'test\ntest'.split('').map(str => str.charCodeAt(0));
      let readStream = new BufferReadableMock(Uint8Array.from(data));

      let passStream = new BufferWritableMock();
      let outStream = new BufferWritableMock();

      passStream.on('finish', () => {
         expect(Buffer.concat(passStream.data).toString('utf-8')).equal('test\ntest');
         done();
      });

      readStream.pipe(getCommandStream(dispatcher, outStream)).pipe(passStream);

   });

   it('writes out staring starting from :put or :get followed by enter', (done) => {
      let data = ':put file\nsomething'.split('').map(str => str.charCodeAt(0));
      let readStream = new BufferReadableMock(Uint8Array.from(data));

      let passStream = new BufferWritableMock();
      let outStream = new BufferWritableMock();

      passStream.on('data', (data) => {
         console.log(data);
      });

      passStream.on('finish', () => {
         expect(Buffer.concat(outStream.data).toString('utf-8')).equal('client command\ndone');
         expect(dispatcher.dispatchCommand).calledWith(':put', ':put file');
         expect(Buffer.concat(passStream.data).toString('utf-8')).equal('\nsomething');
         done();
      });

      readStream.pipe(getCommandStream(dispatcher, outStream)).pipe(passStream);

   });

});
