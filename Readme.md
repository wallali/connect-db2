connect-db2 
===========
[![Downloads](https://img.shields.io/npm/dm/connect-db2.svg)](https://npmjs.org/package/connect-db2)

An [IBM DB2](http://www.ibm.com/analytics/us/en/technology/db2/) session store for [express.js](http://expressjs.com/).

* The key idea behind this project is to allow using [IBM dashDB](https://console.ng.bluemix.net/catalog/services/dashdb/) for session storage for Node.js express apps deployed to [IBM Bluemix](https://console.ng.bluemix.net/).
* Database access is provided through the [node-ibm_db](https://www.npmjs.com/package/ibm_db) package (so [their issues](https://github.com/ibmdb/node-ibm_db/issues) may affect us).

Setup
-----
[![NPM](https://nodei.co/npm/connect-db2.png)](https://npmjs.org/package/connect-db2)

Install via npm:
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

### Using a data source name (DSN)
An altenative to supplying individual settings is to supply the full DSN string in the config instead:

```js
var session = require('express-session');
var Db2Store = require('connect-db2')(session);

var options = {
    dsn: 'DRIVER={DB2};DATABASE=BLUDB;HOSTNAME=localhost;PORT=50000;PROTOCOL=TCPIP;UID=db2user;PWD=password;'
};

var sessionStore = new Db2Store(options);
app.use(session({
    store: sessionStore,
    secret: 'keyboard cat'
}));
```

Note: When a DSN is available in the store config it will always be preferred over individual connection settings.

### Using an existing connection
```js
var session = require('express-session');
var Db2Store = require('connect-db2')(session);
var ibmdb = require('ibm_db');

var dsn = 'DRIVER={DB2};DATABASE=BLUDB;HOSTNAME=loclhost;PORT=50000;PROTOCOL=TCPIP;UID=db2user;PWD=password;';
var options = {};
var conn = ibmdb.openSync(dsn);

var sessionStore = new Db2Store(options, conn);
app.use(session({
    store: sessionStore,
    secret: 'keyboard cat'
}));
```

### Enabling SSL

Set `options.use_ssl` to `true` if you want to connect using SSL when using individual settings.

```js
var session = require('express-session');
var Db2Store = require('connect-db2')(session);

var options = {
	host: 'localhost',
	port: 50001,               // SSL port
	user: 'db2user',
	password: 'password',
	database: 'BLUDB',
    use_ssl: true
};

var sessionStore = new Db2Store(options);
app.use(session({
    store: sessionStore,
    secret: 'keyboard cat'
}));
```

When using a DSN, you can either set the `options.dsn` to an SSL connection string or set `options.use_ssl = true`, and use the `options.ssldsn` property.

```js
var session = require('express-session');
var Db2Store = require('connect-db2')(session);

var options = {
    ssldsn: 'DRIVER={DB2};DATABASE=BLUDB;HOSTNAME=loclhost;PORT=50001;PROTOCOL=TCPIP;UID=db2user;PWD=password;Security=SSL;',
    use_ssl: true
};

var sessionStore = new Db2Store(options);
app.use(session({
    store: sessionStore,
    secret: 'keyboard cat'
}));
```

So when using DSNs, `options.ssldsn` and `options.dsn` can both be set and valid and you can choose between them using the `options.use_ssl` flag. 
This makes it convenient when working within the Bluemix environment where both properties are pre-set in the service config.


Creating the session table
--------------------------

You can ask the store to create the session table for you:

```js
sessionStore.createDatabaseTable(function(error){
    if(error){
        // deal with it 
        return;
    }
});
```

This will ofcourse fail if the table already exists. 
To create the table only when it does not exist, use:

```js
sessionStore.hasDatabaseTable(function(error, hasTable){
    if(error){
        // deal with it 
        return;
    }
    if(hasTable === false) {
        sessionStore.createDatabaseTable(function(error){

        });
    }
});
```

Closing the session store
-------------------------

To cleanly close the session store:
```js
sessionStore.close(function(error){
    if(error){
        // deal with it 
        return;
    }
});
```

Options
-------

Here is a list of all available options together with their default values:
```js
var options = {
	host: 'localhost',         // Host name for database connection.
	port: 50000,               // Port number for database connection.
	user: 'db2user',       	   // Database user.
	password: 'password',      // Password for the above database user.
	database: 'BLUDB',         // Database name.
	expiration: 2592000,       // The maximum age of a valid session; milliseconds.
	use_ssl: false             // If true, use options.ssldsn or create a SSL DSN when connecting. 
	schema: {
		tableName: 'sessions',
		columnNames: {
			session_id: 'session_id',
			expires: 'expires',
			data: 'data'
		}
	},
    allowDrop: false            // When true, allows dropping the session table by calling sessionStore.dropDatabaseTable()
};
```

Contributing
------------

[![GitHub issues](https://img.shields.io/github/issues/wallali/connect-db2.svg)](https://github.com/wallali/connect-db2/issues)

There are a number of ways you can contribute:

* **Improve or correct the documentation** - All the documentation is in this readme file. If you see a mistake, or think something should be clarified or expanded upon, please [submit a pull request](https://github.com/wallali/connect-db2/pulls/new)
* **Add test cases** - There is need for more test cases and unit-tests to cover uncovered areas of code. It is a great way to get started with this project.
* **Report a bug** - Please review [existing issues](https://github.com/wallali/connect-db2/issues) before submitting a new one; to avoid duplicates. If you can't find an issue that relates to the bug you've found, please [create a new one](https://github.com/wallali/connect-db2/issues).
* **Fix a bug** - Have a look at the [existing issues](https://github.com/wallali/connect-db2/issues) for the project. If there's a bug in there that you'd like to tackle, please feel free to do so. Please submit a test case with that covers your code. After you've done all that, you can [submit a pull request](https://github.com/wallali/connect-db2/pulls/new) with your changes.
* **Request a feature** - Again, please review the [existing issues](https://github.com/wallali/connect-db2/issues) before posting a feature request. If you can't find an existing one that covers your feature idea, please [create a new one](https://github.com/wallali/connect-db2/issues). This project is maintained in my free time, chances are you will need to implement your feature idea yourself or wait till I get the chance to do it.

Before you contribute code, please read through at least some of the source code for the project. I would appreciate it if any pull requests for source code changes follow the coding style of the rest of the project. Use `npm run lint` to lint your code before submission.

Configure Local Dev Environment
---------------------------
### Step 1: Get the Code

First, you'll need to pull down the code from GitHub:
```
git clone https://github.com/wallali/connect-db2.git
```

### Step 2: Install Dependencies

Second, you'll need to install the project dependencies as well as the dev dependencies. To do this, simply run the following from the directory you created in step 1:
```
npm install
```

### Step 3: Set Up the Test Database

Now, you'll need to set up a local test database or [create a free dashDB instance](https://console.ng.bluemix.net/catalog/services/dashdb/) on IBM Bluemix:

```js
{
	host: 'localhost',
	port: 50000,
	user: 'db2user',
	password: 'password',
	database: 'BLUDB',
    dsn: ''
};
```
*The test database settings are located in [test/config.js](https://github.com/wallali/connect-db2/blob/master/test/config.js)*

Alternatively, you can provide custom database configurations via environment variables:
```
DB_HOST="localhost"
DB_PORT="50000"
DB_USER="db2user"
DB_PASS="password"
DB_NAME="BLUDB"
```

or a DSN via environment variables:
```
DB_DSN="DRIVER={DB2};DATABASE=BLUDB;HOSTNAME=localhost;PORT=50000;PROTOCOL=TCPIP;UID=db2user;PWD=password;"
```

### Running Tests

With your local environment configured, running tests is as simple as:
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


See Also
--------
* [IBM dashDB Reference](https://www.ibm.com/support/knowledgecenter/SS6NHC/com.ibm.swg.im.dashdb.doc/learn_how/database_reference.html)
* [IBM developer Q&A](https://developer.ibm.com/answers/topics/dashdb/)
* [DB2 Q&A on Stackoverflow](http://stackoverflow.com/questions/tagged/db2)

License
-------

[MIT](https://github.com/wallali/connect-db2/blob/master/LICENSE)
