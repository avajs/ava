# Setting up AVA for Isolated MongoDB Integration Tests

This recipe outlines how to run disposable MongoDB databases in your AVA tests with per-test isolation. This uses `mongomem` which is available on [npm](https://www.npmjs.com/package/mongomem).

`mongomem` is a package that allows you to quickly run a temporary MongoDB server locally. It uses temporary file storage which is destroyed when the server stops. 


## Install MongoDB in-memory Server (MongoMem)

In the root directory of your application, run:

```console
$ npm install --save-dev mongomem
```


## Using MongoMem

In your test file, import the module, and run the server.
 
**Make sure to run the server at the start of your file, outside of any test cases.**

```js
import test from 'ava';
import {MongoDBServer} from 'mongomem';

test.before('start mongodb server', async t => {
	await MongoDBServer.start();
})

test('some feature', async t => {
	const connectionString = await MongoDBServer.getConnectionString();

	// connectionString === 'mongodb://localhost:27017/3411fd12-b5d6-4860-854c-5bbdb011cb93'
	// Use `connectionString` to connect to the database with a client of your choice. See below for usage with Mongoose.
});

```


## Cleaning Up

After you have run your tests, you should include a `test.after.always()` method to clean up the MongoDB server. This will remove any temporary files the server used while running.

This is normally cleaned up by your operating system but it is good practise to do it manually to avoid OS-specific issues.

```js
test.after.always('cleanup', t => {
	MongoDBServer.tearDown(); // This will clean up temporary file storage
});
```


## Debugging

If the server does not seem to start, you can set the following option before you call `MongoDBServer.start()`:
`MongoDBServer.debug = true;`

This will allow the MongoDB server to print connection or file permission errors when it's starting. It checks and picks an available port to run the server on, so errors are likely to be related to file permissions.


## Extra: Setup and Use in Mongoose (MongoDB ODM)

Mongoose is a robust Object-Document-Mapper (ODM) for MongoDB. Refer to [Mongoose ODM v4.9.4](http://mongoosejs.com) for full guides and documentation to get started with Mongoose.

### Import Mongoose

```js
// `myTestCase.test.js` - (your test case file!)
import mongoose from 'mongoose';
```

`mongoose` in this case is a single instance of the Mongoose ODM and is globally available. This is great for your app as it maintains a single access point to your database, but less great for isolated testing. 

You should isolate Mongoose instances between your tests, so that the order of test execution is never depended on. This can be done with a little bit of work.

### Isolate Mongoose Instance

You can easily request a new instance of Mongoose. First, call `new mongoose.Mongoose()` to get the new instance, and then call `connect` with a database connection string provided by the `mongomem` package.

**You will have to manually copy models from the global instance to your new instance.**

```js
import mongoose from 'mongoose';
import {MongoDBServer} from 'mongomem';

test.before('start mongodb', async t => {
	await MongoDBServer.start();
});

test.beforeEach(async t => {
	const db = new mongoose.Mongoose();
	await db.connect(await MongoDBServer.getConnectionString());

	for (const name of mongoose.modelNames()) {
		db.model(name, mongoose.model(name).schema);
	}

	t.context.db = db;
});

test('my mongoose model integration test', async t => {
	const {db} = t.context;
	// Now use the isolated DB instance in your test
});
```
