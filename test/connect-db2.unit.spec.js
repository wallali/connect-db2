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
        database: 'ADB',
        allowDrop: true,
        dsn: '',
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

    it('each stores config is independent', function () {
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
});
