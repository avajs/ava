# Endpoint testing with Mongoose

This recipe shows you how to test your endpoints with AVA and Mongoose, assuming you use Express as your framework.

## Setup

This recipe uses the following libraries:

1. [MongoDB memory server](https://github.com/nodkz/mongodb-memory-server) (A MongoDB in-memory Server)
2. [Babel Polyfill](https://babeljs.io/docs/usage/polyfill/) (required for MongoDB memory server)
3. [Supertest](https://github.com/visionmedia/supertest) (An endpoint testing library)
4. [Mongoose](http://mongoosejs.com)

Install the first three libraries by running the following code:

```console
$ npm install --save-dev mongodb-memory-server babel-polyfill supertest
```

You should have Mongoose installed already. If not, run the following code to install it:

(Note: You need at least Mongoose v4.11.3)

```console
$ npm install mongoose
```

## Setting up AVA

Since MongoDB Memory server requires Babel polyfill to work, the easiest way to set up AVA is through the `ava` key in your `package.json` file.

```json
"ava": {
    "require": [
      "babel-polyfill"
    ]
  },
```

## Your test file

First, include the libraries you need.

```js
// Libraries required for testing
import test from 'ava'
import request from 'supertest'
import MongodbMemoryServer from 'mongodb-memory-server'
import mongoose from 'mongoose'

// Your server and models
import app from '../server'
import User from '../models/User'
```

### Your server file

When you test endpoints, you don't want to start your app. Supertest does this for us automatically when you pass your app into it.

So, if you're using express for your application, make sure you have a startup file that imports `app` and calls `app.listen`

Here's an example of the [server file](https://github.com/zellwk/ava-mdb-test/blob/master/server.js)

And here's an example of your Mongoose [model](https://github.com/zellwk/ava-mdb-test/blob/master/models/User.js)

### Back to your test file

**First, start your MongoDB instance and connect to Mongoose:**

```js
// Start MongoDB Instance
const mongod = new MongodbMemoryServer()

// Create connection to mongoose before all tests
test.before(async t => mongoose.connect(await mongod.getConnectionString(), { useMongoClient: true }))
```

When you run your first test, MongoDB downloads the latest MongoDB Binaries. It may take a minute. (The download is ~70mb).

Note: Since we're using async/await, you need Node v7.6 and above.

**Add fixtures for each test**

You'll want to populate your database with dummy data. Here's an example:

```js
test.beforeEach(async t => {
  const user = new User({
  	email: 'one@example.com',
  	name: 'One'
  })
  await user.save()
})
```

**Clear your dummy data after each test**:

```js
// Cleans up database after every test
test.afterEach.always(async t => await User.remove())
```

**Write your tests**

Use Supertest to fire a request for your endpoint. Then, do the rest with AVA normally.

Note: Make sure your tests run serially with `test.serial`.

```js
// First test
// Note: tests must be serial tests.
// It is NOT RECOMMENDED to run parallel tests within an AVA test file when using Mongoose
test.serial('litmus get user', async t => {
  const { app } = t.context
  const res = await request(app)
    .get('/litmus')
    .send({email: 'one@example.com'})
  t.is(res.status, 200)
  t.is(res.body.name, 'One')
})

// Second test
test.serial('litmus create user', async t => {
  const { app } = t.context
  const res = await request(app)
    .post('/litmus')
    .send({
      email: 'new@example.com',
      name: 'New name'
    })

  t.is(res.status, 200)
  t.is(res.body.name, 'New name')

  // Verifies that user is created in DB
  const newUser = await User.findOne({email: 'new@example.com'})
  t.is(newUser.name, 'New name')
})
```

**Shutdown your server and connection when done**:

```js
// Disconnect MongoDB and Mongoose after all tests are done
test.after.always(async t => {
  mongoose.disconnect()
  mongod.stop()
})

```

And you're done!

## Reusing the configuration across files

You may choose to abstract code for `test.before`, `test.beforeEach`, `test.afterEach.always` and `test.after.always` into a separate file.

To see a demo of this configuration file, look at https://github.com/zellwk/ava-mdb-test
