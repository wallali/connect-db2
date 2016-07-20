'use strict';

module.exports = {
    host: process.env.DB_HOST !== undefined ? process.env.DB_HOST : 'localhost',
    port: process.env.DB_PORT !== undefined ? process.env.DB_PORT : 50000,
    user: process.env.DB_USER !== undefined ? process.env.DB_USER : 'myuser',
    password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'password',
    database: process.env.DB_NAME !== undefined ? process.env.DB_NAME : 'BLUDB',
    allowDrop: true,
    dsn: process.env.DB_DSN !== undefined ? process.env.DB_DSN : '',
    schema: {
        tableName: 'test_sessions'
    }
};