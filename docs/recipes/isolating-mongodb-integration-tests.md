# Setting up Ava for Isolated MongoDB Integration Tests

<<<<<<< Updated upstream
This recipe outlines how to run disposable MongoDB databases in your Ava tests, isolated between tests.
=======
This recipe outlines how to run disposable MongoDB databases in your AVA tests with per-test isolation.
This uses `mongomem` which is available on [npm](https://www.npmjs.com/package/mongomem).

`mongomem` is a package that allows you to quickly run a temporary MongoDB server locally.
It uses temporary file storage which is destroyed when the server stops. 
>>>>>>> Stashed changes

## Install MongoDB in-memory Server (MongoMem)
In the root directory of your application, run:

`npm install mongomem --save-dev`

## Using MongoMem
In your test file, import the module and run the server. 
*Make sure to run the server at the start of your file, outside of any test cases.*

```javascript
import { MongoDBServer } from 'mongomem';
<<<<<<< Updated upstream
let hasStarted = MongoDBServer.start();

// ES6 promise syntax
test('some feature - es6', t => {
	// wait for server to be ready
	hasStarted.then(() => {
		MongoDB.getConnectionString().then(connectionString => {
			// run logic with access to connectionString
		});
	});
});

// async/await syntax
test('some feature - async/await', async t => {
	await hasStarted;
	let connectionString = await MongoDBServer.getConnectionString();
=======

test.before('start mongodb server', async t => {
	await MongoDBServer.start();
})

test('some feature', async t => {
	const connectionString = await MongoDBServer.getConnectionString();
	
	// connectionString === 'mongodb://localhost:27017/3411fd12-b5d6-4860-854c-5bbdb011cb93'
	// use connectionString to connect to the database with a client of your choice. See below for usage with Mongoose.
});

```

## Cleaning Up

After you have run your tests, you should include a `test.after.always` method to clean up the MongoDB server.
This will remove any temporary files the server used while running.

This is normally cleaned up by your operating system but it is good practise to do it manually to avoid OS-specific issues.

```javascript
test.after.always('cleanup', t => {
  MongoDBServer.tearDown(); // This will clean up temporary file storage.
>>>>>>> Stashed changes
});
```

## Debugging
If the server does not seem to start, you can set the following option before you call `MongoDBServer.start()`:
`MongoDBServer.debug = true;`

This will allow the MongoDB server to output to the console upon start, and you will see any connection errors here. 

## Extra: Setup and Use in Mongoose (MongoDB ODM)
Mongoose is a robust ODM for MongoDB.

### Install
`npm install mongoose --save`

Refer to [Mongoose ODM v4.9.4](http://mongoosejs.com/index.html) for full guides and documentation to get started with Mongoose.

### Import Mongoose

```javascript
// myTestCase.test.js - (your test case file!)
import mongoose from 'mongoose';
```

`mongoose` in this case is a single instance of the Mongoose ODM and is globally available by importing ‘mongoose’. This is great for your application as it maintains a single access point to your database, but less great for isolated testing. 

You should isolate mongoose between your tests so that the order of test execution is never depended on, and this can be done with a little bit of work.

### Isolate Mongoose Instance

You can easily request a new instance of Mongoose.
First, call `new mongoose.Mongoose()` to get the new instance, and then call `connect` with a database connection string provided by the `mongomem` package.

*You will need to re-attach the old models from the global mongoose to the new one as it does not carry this information over.*

```javascript
import mongoose from 'mongoose';
import { MongoDBServer } from 'mongomem';

<<<<<<< Updated upstream
let hasStarted = MongoDBServer.start();

test('my mongoose model integration test', async t => {
	await hasStarted;
	const odm = new mongoose.Mongoose();
	odm.connect(await MongoDBServer.getConnectionString());
	
	// Re-assign original mongose models to new Mongoose connection
	Object.keys(mongoose.models).forEach(name => {
		let model = mongoose.models[name];
		odm.model(name, model.schema);
	});

	// Now you can test with Mongoose using the 'odm' variable...
=======
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
	// Now use the isolated DB instance in your test...
>>>>>>> Stashed changes
});
```
