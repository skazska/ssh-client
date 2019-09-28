/* global describe, it */
require('mocha');
const {expect} = require('chai');

const {connectionParams, forwardingParams} = require('../lib/connection-params');

describe('connection-params', () => {
    describe('connectionParams', () => {
        it('usr:pwd@srv:prt', () => {
            expect(connectionParams({'_': ['usr:pwd@srv:666']})).eql({
                username: 'usr',
                password: 'pwd',
                host: 'srv',
                port: 666
            })
        });
        it('usr:pwd@srv', () => {
            expect(connectionParams({'_': ['usr:pwd@srv']})).eql({
                username: 'usr',
                password: 'pwd',
                host: 'srv',
                port: 0
            })
        });
        it('usr@srv', () => {
            expect(connectionParams({'_': ['usr:pwd@srv']})).eql({
                username: 'usr',
                password: 'pwd',
                host: 'srv',
                port: 0
            })
        });
        it('usr@srv', () => {
            expect(connectionParams({'_': ['usr@srv']})).eql({
                username: 'usr',
                password: null,
                host: 'srv',
                port: 0
            })
        });
        it('srv', () => {
            expect(connectionParams({'_': ['srv']})).eql({
                username: null,
                password: null,
                host: 'srv',
                port: 0
            })
        });
        it('-l usr srv ', () => {
            expect(connectionParams({'_': ['srv'], l: 'usr'})).eql({
                username: 'usr',
                password: null,
                host: 'srv',
                port: 0
            })
        });
        it('-l usr srv ', () => {
            expect(connectionParams({'_': ['srv'], l: 'usr', p: 'pwd'})).eql({
                username: 'usr',
                password: null,
                host: 'srv',
                port: 0
            })
        });

    });
    describe('forwardingParams', () => {
        it('-L host:8080:rhost:80', () => {
            expect(forwardingParams({L: 'host:8080:rhost:80'})).eql({
                forward: {
                    bindAddr: 'host',
                    bindPort: '8080',
                    addr: 'rhost',
                    port: '80',
                }
            });
        });
        it('-L 8080:rhost:80', () => {
            expect(forwardingParams({L: '8080:rhost:80'})).eql({
                forward: {
                    bindAddr: '127.0.0.1',
                    bindPort: '8080',
                    addr: 'rhost',
                    port: '80',
                }
            })
        });
        it('-R host:8080:rhost:80', () => {
            expect(forwardingParams({R: 'host:8080:rhost:80'})).eql({
                reverse: {
                    bindAddr: 'host',
                    bindPort: '8080',
                    addr: 'rhost',
                    port: '80',
                }
            });
        });
        it('-R 8080:rhost:80', () => {
            expect(forwardingParams({R: '8080:rhost:80'})).eql({
                reverse: {
                    bindAddr: '127.0.0.1',
                    bindPort: '8080',
                    addr: 'rhost',
                    port: '80',
                }
            })
        });

    });
});
