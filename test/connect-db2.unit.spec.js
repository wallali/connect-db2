'use strict';

var assert = require('assert');
var ibmdb = require('ibm_db');
var session = require('express-session');
var sinon = require('sinon');
var Db2Store = require('..')(session);

describe('Db2Store constructor', function () {
    var config = {
        host: 'somehost',
        port: 50000,
        username: 'auser',
        password: 'apassword',
        database: 'ADB'
    };

    before(function () {
        sinon.stub(ibmdb, 'openSync');
    });

    after(function () {
        ibmdb.openSync.restore();
    });

    it('errors when called as a function', function () {
        assert.throws(function () {
            Db2Store(config);
        }, /Cannot call Db2Store constructor as a function/);
    });

    it('uses supplied connection', function () {
        var connection = {
            connected: true,
            dummy: true
        };
        var sessionStore = new Db2Store(config, connection);

        assert.deepStrictEqual(sessionStore._client, connection);
    });

    it('errors when supplied connection is not open', function () {
        assert.throws(function () {
            var connection = {
                connected: false
            };
            new Db2Store({}, connection);
        }, /db connection is not open/);
    });

    it('keeps each stores config independent', function () {
        var config1 = {
            option: 1
        };
        var config2 = {
            option: 2
        };
        var sessionStore1 = new Db2Store(config1);
        var sessionStore2 = new Db2Store(config2);

        assert.strictEqual(sessionStore1._options.option, config1.option);
        assert.strictEqual(sessionStore2._options.option, config2.option);
    });

    it('copies user options over defaults', function () {
        var store = new Db2Store(config);

        assert(store._options);
        assert.strictEqual(store._options.host, config.host);
        assert.strictEqual(store._options.database, config.database);
        assert(!store._options.allowDrop);
    });

});

describe('Interface tests', function () {
    var querySpy;
    var rows;
    var err;

    var connection = {
        query: function (q, p, cb) {
            if (typeof p === 'function') {
                cb = p;
            }
            return cb(err, rows);
        }
    };
    var store;

    before(function () {
        sinon.stub(ibmdb, 'openSync').returns(connection);
        querySpy = sinon.spy(connection, 'query');
        store = new Db2Store({});
    });

    after(function () {
        ibmdb.openSync.restore();
    });

    beforeEach(function () {
        rows = err = null;
    });

    afterEach(function () {
        querySpy.reset();
    });

    describe('get', function () {
        it('queries session and returns results', function (done) {
            rows = [{
                data: '{}'
            }];
            store.get('123', function (e, r) {
                assert(querySpy.calledOnce);
                assert(!e);
                assert(r);
                assert(connection.query.args[0][0].match(/SELECT/i));
                assert.strictEqual(connection.query.args[0][1][0], '123');
                done();
            });
        });

        it('returns error on error', function (done) {
            err = 'an error';
            store.get('123', function (e, r) {
                assert(querySpy.calledOnce);
                assert(e);
                assert(!r);
                assert.strictEqual(e, err);
                done();
            });
        });
    });

    describe('set', function () {
        it('inserts session if no existing', function (done) {
            rows = [];
            store.set('223', {}, function (e) {
                assert(querySpy.calledTwice);
                assert(!e);
                assert(connection.query.args[1][0].match(/INSERT/i));
                assert.strictEqual(connection.query.args[0][1][0], '223');
                assert.strictEqual(connection.query.args[1][1][0], '223');
                done();
            });
        });

        it('updates session if existing', function (done) {
            rows = [{
                length: 1
            }];
            store.set('223', {}, function (e) {
                assert(querySpy.calledTwice);
                assert(!e);
                assert(connection.query.args[1][0].match(/UPDATE .* WHERE/i));
                assert.strictEqual(connection.query.args[0][1][0], '223');
                assert.strictEqual(connection.query.args[1][1][2], '223');
                done();
            });
        });

        it('returns error on error', function (done) {
            err = 'an error';
            store.get('123', function (e) {
                assert(querySpy.calledOnce);
                assert(e);
                assert.strictEqual(e, err);
                done();
            });
        });
    });

    describe('destroy', function () {
        it('deletes session', function (done) {
            store.destroy('123', function (e) {
                assert(querySpy.calledOnce);
                assert(!e);
                assert(connection.query.args[0][0].match(/DELETE .* WHERE/i));
                assert.deepStrictEqual(connection.query.args[0][1], ['123']);
                done();
            });
        });

        it('returns error on error', function (done) {
            err = 'an error';
            store.destroy('123', function (e) {
                assert(querySpy.calledOnce);
                assert(e);
                assert.strictEqual(e, err);
                done();
            });
        });
    });

    describe('touch', function () {
        it('updates session', function (done) {
            store.touch('321', {}, function (e) {
                assert(querySpy.calledOnce);
                assert(!e);
                assert(connection.query.args[0][0].match(/UPDATE .* WHERE/i));
                assert.strictEqual(connection.query.args[0][1][1], '321');
                done();
            });
        });

        it('returns error on error', function (done) {
            err = 'an error';
            store.touch('123', {}, function (e) {
                assert(querySpy.calledOnce);
                assert(e);
                assert.strictEqual(e, err);
                done();
            });
        });
    });

    describe('length', function () {
        it('counts sessions and returns count', function (done) {
            rows = [{
                'length': 3
            }];
            store.length(function (e, r) {
                assert(querySpy.calledOnce);
                assert(!e);
                assert(r === 3);
                assert(connection.query.args[0][0].match(/SELECT COUNT\(\*\)/i));
                done();
            });
        });
        
        it('counts sessions and returns 0 when none', function (done) {
            rows = [];
            store.length(function (e, r) {
                assert(querySpy.calledOnce);
                assert(!e);
                assert(r === 0);
                done();
            });
        });

        it('returns error on error', function (done) {
            err = 'an error';
            store.length(function (e, r) {
                assert(querySpy.calledOnce);
                assert(e);
                assert(!r);
                assert.strictEqual(e, err);
                done();
            });
        });
    });
    
    describe('clear', function () {
        it('clears table', function (done) {
            store.clear(function (e) {
                assert(querySpy.calledOnce);
                assert(!e);
                assert(connection.query.args[0][0].match(/DELETE/i));
                done();
            });
        });

        it('returns error on error', function (done) {
            err = 'an error';
            store.clear(function (e) {
                assert(querySpy.calledOnce);
                assert(e);
                assert.strictEqual(e, err);
                done();
            });
        });
    });
});
