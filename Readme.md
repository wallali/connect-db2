connect-db2
===========

A DB2 session store for [express.js](http://expressjs.com/).

Setup
-----

```sh
npm install connect-db2 express-session --save
```

Pass the `express-session` store into `connect-db2` to create a `Db2Store` constructor.

```js
var session = require('express-session');
var Db2Store = require('connect-db2')(session);

var options = {
	host: 'localhost',
	port: 50000,
	user: 'db2user',
	password: 'password',
	database: 'BLUDB'
};

var sessionStore = new Db2Store(options);
app.use(session({
    store: sessionStore,
    secret: 'keyboard cat'
}));
```

### Using a DSN
Altenatively if you prefer, you can use the full dsn string in the config instead:

```js
var session = require('express-session');
var Db2Store = require('connect-db2')(session);

var options = {
    dsn: 'DATABASE=BLUDB;HOSTNAME=loclhost;PORT=50000;PROTOCOL=TCPIP;UID=db2user;PWD=password;'
};

var sessionStore = new Db2Store(options);
app.use(session({
    store: sessionStore,
    secret: 'keyboard cat'
}));
```

### Using an existing connection
```js
var session = require('express-session');
var Db2Store = require('connect-db2')(session);
var ibmdb = require('ibm_db');

var dsn = 'DATABASE=BLUDB;HOSTNAME=loclhost;PORT=50000;PROTOCOL=TCPIP;UID=db2user;PWD=password;';
var options = {};
var conn = ibmdb.openSync(dsn);

var sessionStore = new Db2Store(options, conn);
app.use(session({
    store: sessionStore,
    secret: 'keyboard cat'
}));
```

Closing the session store
-------------------------

To cleanly close the session store:
```js
sessionStore.close();
```

Options
-------

Here is a list of all available options:
```js
var options = {
	host: 'localhost',// Host name for database connection.
	port: 50000,// Port number for database connection.
	user: 'db2user',// Database user.
	password: 'password',// Password for the above database user.
	database: 'BLUDB',// Database name.
	expiration: 2592000,// The maximum age of a valid session; milliseconds.
	schema: {
		tableName: 'sessions',
		columnNames: {
			session_id: 'session_id',
			expires: 'expires',
			data: 'data'
		}
	},
    allowDrop: false // If true, allows dropping the session table by calling sessionStore.dropDatabaseTable(), default: false
};
```

Running Tests
-------------
Tests require a running DB2 instance to execute against. 

Run tests using npm test.

```
npm test
```

Debugging
---------

`connect-db2` uses the [debug module](https://github.com/visionmedia/debug) to output debug messages to the console. To output all debug messages, run your node app with the `DEBUG` environment variable:
```
DEBUG=connect:db2 node your-app.js
```
This will output debugging messages from `connect-db2`.

License
-------

MIT
