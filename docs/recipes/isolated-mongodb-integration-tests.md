# Isolated MongoDB integration tests

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/isolated-mongodb-integration-tests.md)

> How to run disposable MongoDB databases in your AVA tests with per-test isolation.

This uses [`MongoMem`](https://github.com/CImrie/mongomem), which allows you to quickly run a temporary MongoDB server locally. It uses temporary file storage which is destroyed when the server stops.


## Install MongoDB in-memory Server (MongoMem)

In the root directory of your app, run:

```console
$ npm install --save-dev mongomem
```


## Using MongoMem

In your test file, import the module, and run the server.

**Make sure to run the server at the start of your file, outside of any test cases.**

```js
import test from 'ava';
import {MongoDBServer} from 'mongomem';

test.before('start server', async t => {
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

This is normally cleaned up by your operating system, but it is good practise to do it manually.

```js
test.after.always('cleanup', t => {
	MongoDBServer.tearDown(); // Cleans up temporary file storage
});
```


## Debugging

If the server does not seem to start, you can set the `MongoDBServer.debug = true;` option before you call `MongoDBServer.start()`. This will allow the MongoDB server to print connection or file permission errors when it's starting. It checks and picks an available port to run the server on, so errors are likely to be related to file permissions.

## Extra: Setup and use in Mongoose

[Mongoose](https://mongoosejs.com) is a robust Object-Document-Mapper (ODM) for MongoDB. Refer to its documentation to get started with Mongoose.

To use Mongoose effectively with AVA, check out the [Mongoose integration docs](endpoint-testing-with-mongoose.md).
