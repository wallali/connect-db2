0.5.0 / 2016-12-30
==================

- Add operation clearExpired to allow clearing expired session from the session table.

0.4.0 / 2016-10-07
==================

-  Allow SSL connection when using individual settings.
-  Allow using ssldsn from config.

0.3.2 / 2016-10-03
==================

-  Use process.nextTick to make all callbacks asynchronous.

0.3.0 / 2016-08-05
==================

-  Add an explicit ORGANIZE BY ROW to session table creation SQL.

0.2.0 / 2016-07-22
==================

-   Issue #2 addressed. Expired sessions are no longer returned.
-   Added hasDatabaseTable to allow checking if the table already exists.
-   Ensure session table is created UNICODE.


0.1.0 / 2016-07-21
==================

-   Align config to bluemix VCAP_SERVICES for easy integration.
 
 
0.0.1 / 2016-07-19
==================

-	Project created





