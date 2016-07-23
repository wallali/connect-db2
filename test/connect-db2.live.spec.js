'use strict';

var assert = require('assert');
var session = require('express-session');
var config = require('./config');
var fixtures = require('./fixtures');
var Db2Store = require('..')(session);

describe('Session interface', function () {
    
    /**
     * These tests are performed against a live database. 
     * They are required to be run in sequence as each tests sets up the database for the next one.
     * While this is not ideal, it is the quickest way to verify all operations are working as intended.
     **/
    
    var sessionStore = new Db2Store(config);
    var session = fixtures.sessions[0];

    before(function (done) {
        sessionStore.createDatabaseTable(function (err) {
            if (err) throw err;
            done();
        });
    });

    after(function (done) {
        sessionStore.dropDatabaseTable(function (err) {
            if (err) throw err;
            sessionStore.close(function (err) {
                if (err) throw err;
                assert(!sessionStore._client.connected);
                done();
            });
        });
    });

    it('has database table', function (done) {
        sessionStore.hasDatabaseTable(function (err, result) {
            assert(!err);
            assert(result);
            done();
        });
    });

    it('sets session', function (done) {
        sessionStore.set(session.session_id, session, function (err) {
            assert(!err);
            done();
        });
    });

    it('sets session, updates existing session', function (done) {

        session.cookie = {
            expires: '2000-1-1'
        };

        sessionStore.set(session.session_id, session, function (err) {
            session.cookie = {};
            assert(!err);
            done();
        });
    });

    it('wont get an expired session', function (done) {
        sessionStore.get(session.session_id, function (err, sess) {
            assert(!err);
            assert(!sess, 'Session should not be returned');
            done();
        });
    });

    it('touch updates session expiration', function (done) {
        sessionStore.touch(session.session_id, session, function (err) {
            assert(!err);
            done();
        });
    });

    it('gets session', function (done) {
        sessionStore.get(session.session_id, function (err, sess) {
            assert(!err);
            assert(sess, 'Session should be returned');
            assert.deepStrictEqual(sess.data, session.data);
            done();
        });
    });

    it('length gets total session count', function (done) {
        sessionStore.length(function (err, length) {
            assert(!err);
            assert.equal(length, 1);
            done();
        });
    });

    it('destroy session deletes session', function (done) {
        sessionStore.destroy(session.session_id, function (err) {
            assert(!err);
            sessionStore.get(session.session_id, function (err, data) {
                assert(!err);
                assert(!data);
                done();
            });
        });
    });

    it('clear clears all sessions', function (done) {
        sessionStore.set(session.session_id, session, function (err) {
            assert(!err);

            sessionStore.clear(function (err) {
                assert(!err);

                sessionStore.length(function (err, length) {
                    assert(!err);
                    assert.equal(length, 0);
                    done();
                });
            });
        });
    });
});
