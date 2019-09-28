/* global describe, it */
require('mocha');
const {expect, use} = require('chai');
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
use(sinonChai);

const transferFileModule = require('../lib/transfer-file');

const getCommandDispatcher = require('../lib/command-dispatcher').get;

const fakeTransferFile = () => {
    const fake = sinon.fake.resolves('');
    sinon.stub(transferFileModule, 'transferFile').callsFake(fake);
    return fake;
};

describe('command-dispatcher', () => {
    describe('identifyCommand', () => {
        const dispatcher = getCommandDispatcher();
        it('identifies strings starting from any key of commands returns key or false', () => {
            expect(dispatcher.identifyCommand(':ge')).equal(false);
            expect(dispatcher.identifyCommand(':get')).equal(':get');
            expect(dispatcher.identifyCommand(':gety')).equal(false);
            expect(dispatcher.identifyCommand(':get input')).equal(':get');
            expect(dispatcher.identifyCommand('get')).equal(false);
        });
    });

    describe('dispatchCommand', () => {
        let transferFileFake;
        let dispatcher;
        beforeEach( () => {
            transferFileFake = fakeTransferFile();
            dispatcher = getCommandDispatcher(null);
        });

        afterEach( () => {
            sinon.restore();
        });

        it(':put file-from file-to parses prams & invokes transferFile', async () => {
            await dispatcher.dispatchCommand(':put', ':put file-from.ext /path/file-to');
            expect(transferFileFake).calledWith('put', null, 'file-from.ext', '/path/file-to')
        });

        it (':get file-from file-to parses prams & invokes transferFile', async () => {
            await dispatcher.dispatchCommand(':get', ':get /file-from path/file-to.ext');
            expect(transferFileFake).calledWith('get', null, '/file-from', 'path/file-to.ext')

        });


    });

});

