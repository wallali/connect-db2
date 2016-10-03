/*!
 * Connect - DB2
 * Copyright(c) 2016 Ali Lokhandwala <ali@huestones.co.uk>
 * MIT Licensed
 */

'use strict';

var debug = require('debug')('connect:db2');
var ibmdb = require('ibm_db');
var util = require('util');
var extend = require('extend');
var noop = function () {};


/**
 * One day in seconds.
 */

var oneDay = 86400;


/**
 * Default options
 */

var defaultOptions = {
    expiration: oneDay * 30, // The maximum age of a valid session; milliseconds.
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    },
    allowDrop: false
};


/**
 * Calculate expiration time in seconds from current time.
 * @param {number} expiration the maximum age of a valid session; milliseconds.
 * @returns expiration time in seconds
 */

var secondsHence = function (expiration) {
    var expires = Date.now() + expiration;

    if (!(expires instanceof Date)) {
        expires = new Date(expires);
    }

    // Use whole seconds here; not milliseconds.
    expires = Math.round(expires.getTime() / 1000);

    return expires;
};


/**
 * Work out the session expiration time
 * @param {Object} sess express session
 * @param {number} expiration the maximum age of a valid session; milliseconds.
 * @returns expiration value in seconds
 */

var getExpires = function (sess, expiration) {
    var expires;

    if (sess.cookie) {
        if (sess.cookie.expires) {
            expires = sess.cookie.expires;
        } else if (sess.cookie._expires) {
            expires = sess.cookie._expires;
        }
    }

    if (!expires) { // Use supplied expiration value
        return secondsHence(expiration);
    } else { // Use expiration value from session cookie

        if (!(expires instanceof Date)) {
            expires = new Date(expires);
        }

        // Use whole seconds here; not milliseconds.
        expires = Math.round(expires.getTime() / 1000);

        return expires;
    }
};


/**
 * Return the `Db2Store` extending `express`'s session Store.
 *
 * @param {Object} express session
 * @returns {Function}
 * @api public
 */

module.exports = function (session) {

    /**
     * Express's session Store.
     */

    var Store = session.Store;

    /**
     * Initialize Db2Store with the given `options`.
     *
     * @param {Object} opt
     * @param {Object} [connection] an ibmdb connection.
     * @api public
     */

    var Db2Store = function (opt, connection) {
        if (!(this instanceof Db2Store)) {
            throw new TypeError('Cannot call Db2Store constructor as a function');
        }

        var self = this;

        this._options = extend(true, {}, defaultOptions, opt || {});

        Store.call(this, this._options);

        if (connection) {
            debug('Using supplied connection, connected: %s', connection.connected);
            this._client = connection;
            if (!this._client.connected) {
                var err = new Error('The supplied db connection is not open');
                throw err;
            }
        } else {
            var dsn = this._options.dsn ||
                'DRIVER={DB2};DATABASE=' + this._options.database +
                ';UID=' + this._options.user +
                ';PWD=' + this._options.password +
                ';HOSTNAME=' + this._options.host +
                ';port=' + this._options.port +
                ';PROTOCOL=TCPIP;';

            //debug('Using dsn "%s"', dsn);

            try {
                self._client = ibmdb.openSync(dsn);
            } catch (err) {
                debug('dashDB returned err', err);
                throw err;
            }
        }
    };

    /**
     * Inherit from `Store`.
     */

    util.inherits(Db2Store, Store);

    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {String} sid
     * @param {Function} fn
     * @api public
     */

    Db2Store.prototype.get = function (sid, fn) {
        var store = this;
        if (!fn) fn = noop;

        debug('Getting session "%s"', sid);

        var expires = secondsHence(0);

        var sql = util.format('SELECT "%s" AS "data" FROM "%s" WHERE "%s" = ? AND "%s" >= ?',
            store._options.schema.columnNames.data,
            store._options.schema.tableName,
            store._options.schema.columnNames.session_id,
            store._options.schema.columnNames.expires);

        store._client.query(sql, [sid, expires], function (err, rows) {

            if (err) {
                debug('Failed to get session');
                debug(err);
                return fn(err, null);
            }

            var result;
            try {
                result = !!rows[0] ? JSON.parse(rows[0].data) : null;

                if (result) debug('Got session "%s"', sid);
            } catch (error) {
                debug(error);
                return fn(new Error('Failed to parse data for session: ' + sid));
            }

            return fn(null, result);
        });
    };

    /**
     * Commit the given `sess` object associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Session} sess
     * @param {Function} fn
     * @api public
     */

    Db2Store.prototype.set = function (sid, sess, fn) {
        var store = this;
        if (!fn) fn = noop;

        debug('Setting session "%s"', sid);

        var expires = getExpires(sess, store._options.expiration);

        var jsess;
        try {
            jsess = JSON.stringify(sess);
        } catch (err) {
            debug(err);
            return process.nextTick(function () {
                fn(err);
            });
        }

        var sql = util.format('SELECT COUNT(*) AS "length" FROM "%s" WHERE "%s" = ?',
            store._options.schema.tableName,
            store._options.schema.columnNames.session_id);

        store._client.query(sql, [sid], function (err, rows) {
            if (err) {
                debug('Failed to determine if session "%s" already exists', sid);
                debug(err);
                return fn(err);
            }

            var count = !!rows[0] ? rows[0].length : 0;
            var params = [];
            if (count > 0) {
                sql = util.format('UPDATE "%s" SET "%s" = ?, "%s" = ? WHERE "%s" = ?',
                    store._options.schema.tableName,
                    store._options.schema.columnNames.expires,
                    store._options.schema.columnNames.data,
                    store._options.schema.columnNames.session_id);

                params = [expires, jsess, sid];

                debug('Session "%s" already exists, will update it', sid);
            } else {
                sql = util.format('INSERT INTO "%s" ("%s", "%s", "%s") VALUES (?, ?, ?)',
                    store._options.schema.tableName,
                    store._options.schema.columnNames.session_id,
                    store._options.schema.columnNames.expires,
                    store._options.schema.columnNames.data);

                params = [sid, expires, jsess];

                debug('Session "%s" will be inserted', sid);
            }

            store._client.query(sql, params, function (err) {
                if (err) {
                    debug('Insert/Update failed for session "%s"', sid);
                    debug(err);
                    return fn(err);
                }

                return fn();
            });
        });
    };

    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {String} sid
     * @api public
     */

    Db2Store.prototype.destroy = function (sid, fn) {
        var store = this;
        if (!fn) fn = noop;

        debug('Destroying session "%s"', sid);

        var sql = util.format('DELETE FROM "%s" WHERE "%s" = ?',
            store._options.schema.tableName,
            store._options.schema.columnNames.session_id);

        store._client.query(sql, [sid], function (err) {
            if (err) {
                debug('Failed to destroy session data');
                debug(err);
                return fn(err);
            }

            return fn();
        });
    };

    /**
     * Refresh the time-to-live for the session with the given `sid`.
     *
     * @param {String} sid
     * @param {Session} sess
     * @param {Function} fn
     * @api public
     */

    Db2Store.prototype.touch = function (sid, sess, fn) {
        var store = this;
        if (!fn) fn = noop;

        debug('Touching session "%s"', sid);

        var expires = getExpires(sess, store._options.expiration);

        debug('Expire "%s" on:%s', sid, expires);

        var sql = util.format('UPDATE "%s" SET "%s" = ? WHERE "%s" = ?',
            store._options.schema.tableName,
            store._options.schema.columnNames.expires,
            store._options.schema.columnNames.session_id);

        store._client.query(sql, [expires, sid], function (err) {
            if (err) {
                debug('Failed to touch session');
                debug(err);
                return fn(err);
            }

            return fn();
        });
    };

    /**
     * Get the count of all sessions in the store.
     *
     * @param {Function} fn
     * @api public
     */

    Db2Store.prototype.length = function (fn) {
        var store = this;
        if (!fn) fn = noop;

        debug('Getting number of sessions');

        var sql = util.format('SELECT COUNT(*) AS "length" FROM "%s"', store._options.schema.tableName);

        store._client.query(sql, function (err, rows) {

            if (err) {
                debug('Failed to get number of sessions');
                debug(err);
                return fn(err);
            }

            var count = !!rows[0] ? rows[0]['length'] : 0;

            fn(null, count);
        });
    };

    /**
     * Delete all sessions from the store.
     *
     * @param {Function} fn
     * @api public
     */

    Db2Store.prototype.clear = function (fn) {
        var store = this;
        if (!fn) fn = noop;

        debug('Clearing all sessions');

        var sql = util.format('DELETE FROM "%s"', store._options.schema.tableName);

        store._client.query(sql, function (err) {
            if (err) {
                debug('Failed to clear all sessions');
                debug(err);
                return fn(err);
            }

            fn();
        });
    };

    /**
     * Close the underlying database connection.
     *
     * @param {Function} [fn]
     * @api public
     */

    Db2Store.prototype.close = function (fn) {
        var store = this;
        if (!fn) fn = noop;

        debug('Closing session store');

        if (!store._client.connected) {
            return process.nextTick(function () {
                fn();
            });
        }

        store._client.close(function (err) {
            if (err) {
                debug(err);
                return fn(err);
            }

            return fn();
        });

    };

    /**
     * Check if the table for storing sessions exists in the database.
     *
     * @param {Function} fn
     * @api public
     * @since 0.2.0 
     */

    Db2Store.prototype.hasDatabaseTable = function (fn) {
        var store = this;
        if (!fn) fn = noop;

        debug('Checking database table exists');

        var sql = util.format('SELECT COUNT(*) AS "count" FROM SYSCAT.TABLES WHERE "TABNAME" = ?');

        store._client.query(sql, [store._options.schema.tableName], function (err, rows) {

            if (err) {
                debug('Failed to get %s table details', store._options.schema.tableName);
                debug(err);
                return fn(err);
            }

            var count = !!rows[0] ? rows[0].count : 0;

            return fn(null, !!count);
        });
    };

    /**
     * Create the table used to store sessions.
     *
     * @param {Function} [fn]
     * @api public
     */

    Db2Store.prototype.createDatabaseTable = function (fn) {
        var store = this;
        if (!fn) fn = noop;

        debug('Creating table %s', store._options.schema.tableName);

        var sql = util.format(
            'CREATE TABLE "%s" ' +
            '("%s" VARCHAR(255) NOT NULL PRIMARY KEY, ' +
            '"%s" BIGINT NOT NULL, ' +
            '"%s" VARCHAR(8100)) ' +
            'CCSID UNICODE ORGANIZE BY ROW',
            store._options.schema.tableName,
            store._options.schema.columnNames.session_id,
            store._options.schema.columnNames.expires,
            store._options.schema.columnNames.data
        );

        store._client.query(sql, function (err) {

            if (err) {
                debug('Failed to create session table');
                debug(err);
                return fn(err);
            }

            return fn();
        });
    };

    /**
     * Drop the table used to store sessions.
     *
     * @param {Function} [fn]
     * @api public
     */

    Db2Store.prototype.dropDatabaseTable = function (fn) {
        var store = this;
        if (!fn) fn = noop;

        if (!store._options.allowDrop) {
            var err = new Error('Dropping session table not allowed by config. ' +
                'Set allowDrop: true in your config to enable this.');
            debug(err);
            return process.nextTick(function () {
                fn(err);
            });
        }

        debug('Dropping table %s', store._options.schema.tableName);

        var sql = util.format('DROP TABLE "%s"', store._options.schema.tableName);

        store._client.query(sql, function (err) {

            if (err) {
                debug('Failed to drop session table');
                debug(err);
                return fn(err);
            }

            return fn();
        });
    };

    return Db2Store;
};