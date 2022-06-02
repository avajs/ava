# Endpoint testing with Mongoose

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/endpoint-testing-with-mongoose.md)

This recipe shows you how to test your endpoints with AVA and Mongoose, assuming you use Express as your framework.

## Setup

This recipe uses the following libraries:

1. [`mongodb-memory-server`](https://github.com/nodkz/mongodb-memory-server) (A MongoDB in-memory Server)
2. [SuperTest](https://github.com/visionmedia/supertest) (An endpoint testing library)
3. [Mongoose](https://mongoosejs.com)

Install the first two libraries by running the following code:

```console
$ npm install --save-dev mongodb-memory-server supertest
```

You should have Mongoose installed already. If not, run the following code to install it:

(Note: You need at least Mongoose v4.11.3)

```console
$ npm install mongoose
```

## Prerequisites

You'll need a server file and a Mongoose model. See the [`server.js`](https://github.com/zellwk/ava-mdb-test/blob/master/server.js) and [`models/User.js`](https://github.com/zellwk/ava-mdb-test/blob/master/models/User.js) examples.

Note that `server.js` does not start the app. Instead this must be done by SuperTest, so that the app endpoints can be tested. If you're using Express for your application, make sure you have a startup file that imports `app` and calls `app.listen()`.

## Your test file

First, include the libraries you need:

```js
// Libraries required for testing
import test from 'ava';
import request from 'supertest';
import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Your server and models
import app from '../server';
import User from '../models/User';
```

Next start the in-memory MongoDB instance and connect to Mongoose:

```js
// Create connection to Mongoose before tests are run
test.before(async t => {
	// First start MongoDB instance
	t.context.mongod = await MongoMemoryServer.create();
	// And connect
	await mongoose.connect(t.context.mongod.getUri());
});
```

When you run your first test, MongoDB downloads the latest MongoDB binaries. The download is ~70MB so this may take a minute.

You'll want to populate your database with dummy data. Here's an example:

```js
test.beforeEach(async () => {
	const user = new User({
		email: 'one@example.com',
		name: 'One'
	});
	await user.save();
});
```

Dummy data should be cleared after each test:

```js
test.afterEach.always(() => User.remove());
```

Now you can use SuperTest to send off a request for your app endpoint. Use AVA for your assertions:

```js
// Note that the tests are run serially. See below as to why.

test.serial('litmus get user', async t => {
	const {app} = t.context;
	const res = await request(app)
		.get('/litmus')
		.send({email: 'one@example.com'});
	t.is(res.status, 200);
	t.is(res.body.name, 'One');
});

test.serial('litmus create user', async t => {
	const {app} = t.context;
	const res = await request(app)
		.post('/litmus')
		.send({
			email: 'new@example.com',
			name: 'New name'
		});

	t.is(res.status, 200);
	t.is(res.body.name, 'New name');

	// Verify that user is created in DB
	const newUser = await User.findOne({email: 'new@example.com'});
	t.is(newUser.name, 'New name');
});
```

Finally disconnect from and stop MongoDB when all tests are done:

```js
test.after.always(async t => {
	await mongoose.disconnect();
	await t.context.mongod.stop();
});

```

And you're done!

## Reusing the configuration across files

You may choose to extract the code for the `test.before`, `test.beforeEach`, `test.afterEach.always` and `test.after.always` hooks into a separate file. Have a look at https://github.com/zellwk/ava-mdb-test for an example.

## Using `test.serial` instead of `test`

Your tests likely change the database. Using `test()` means they run concurrently, which may cause one test to affect another. Instead if you use `test.serial()` then the tests will run one at a time. You can then clean up your database between test runs, making the tests more predictable.

You could run tests concurrently if you create separate Mongoose connections for each test. This is harder to set up, though. More information can be found [here](https://github.com/nodkz/mongodb-memory-server#several-mongoose-connections-simultaneously).
