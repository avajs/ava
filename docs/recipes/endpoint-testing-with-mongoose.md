# Endpoint testing with Mongoose

This recipe shows you how to test your endpoints with AVA and Mongoose.

## Setup

This recipe uses the following libraries:

1. [MongoDB memory server](https://github.com/nodkz/mongodb-memory-server) (A MongoDB in-memory Server)
2. [Babel Polyfill](https://babeljs.io/docs/usage/polyfill/) (required for MongoDB memory server)
3. [Supertest](https://github.com/visionmedia/supertest) (An endpoint testing library)
4. Mongoose

Install the first three libraries by running the following code:

```console
$ npm install --save-dev mongodb-memory-server babel-polyfill supertest
```

You should have Mongoose installed already. If not, run the following code to install it:

(Note: You need at least mongoose v4.11.3)

```console
$ npm install mongoose
```

## Setting up AVA

Since MongoDB Memory server requires Babel polyfill to work, the easiest way to set up AVA is through the `ava` key in your `package.json` file.

```json
"ava": {
    "files": ["test/**/*"],
    "require": [
      "babel-register",
      "babel-polyfill"
    ]
  },
```

If you want AVA to run your tests whenever changes are made, add the `--watch` option.

```json
"scripts": {
  "watch": "ava --watch"
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

In your `server` file, you cannot use `app.listen` to start your app. Export it to another file and call `app.listen` there.

This `server` file should resemble the following:

```js
const express = require('express')
const bodyParser = require('body-parser')
const routes = require('./routes')
const app = express()

// ======================================
// # Middlewares
// ======================================
app.use(bodyParser.json())

// ======================================
// # Routes
// ======================================
app.get('/litmus', async (req, res) => {
  const { email } = req.body
  res.json(await User.findOne({email}))
})

app.post('/litmus', async (req, res) => {
  const { email, name } = req.body
  const user = new User({email, name})
  res.json(await user.save())
})

module.exports = app
```

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
test.serial('litmus get user', async t => {
  const { app } = t.context
  const res = await request(app)
    .get('/litmus')
    .send({email: 'one@example.com'})
  t.is(res.status, 200)
  t.is(res.body.name, 'One')
})

// Second test
// Note: subsequent tests must be serial tests.
// It is NOT RECOMMENDED to run parallel tests within an AVA test file when using Mongoose
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
// Disconnect MongoDB and mongoose after all tests are done
test.after.always(async t => {
  mongoose.disconnect()
  mongod.stop()
})

```

And you're done!

## Reusing the configuration across files

You may choose to abstract code for `test.before`, `test.beforeEach`, `test.afterEach.always` and `test.after.always` into a separate file. It should look similar to this:

```
// utils.js
// File for abstracting generic before, beforeEach, afterEach and after code

const MongodbMemoryServer = require('mongodb-memory-server').default
const mongoose = require('mongoose')

// Your models and server
const app = require('../server')
const User = require('../models/User')

const mongod = new MongodbMemoryServer()

// Create connection to mongoose before all tests
exports.before = async t =>
  mongoose.connect(await mongod.getConnectionString(), { useMongoClient: true })

// Create fixtures before each test
exports.beforeEach = async t => {
  const user = new User({email: 'one@example.com', name: 'One'})
  const user2 = new User({email: 'two@example.com', name: 'Two'})
  const user3 = new User({email: 'three@example.com', name: 'Three'})

  await user.save()
  await user2.save()
  await user3.save()

  // Saves app to t.context so tests can access app
  t.context.app = app
}

// Clean up database after every test
exports.afterEach = async t => await User.remove()

// Disconnect MongoDB and mongoose after all tests are done
exports.after = async t => {
  mongoose.disconnect()
  mongod.stop()
}

```

Your test file then becomes much simpler:

```
import test from 'ava'
import request from 'supertest'
import User from '../models/User'

import {before, beforeEach, afterEach, after} from './utils'

test.before(before)
test.beforeEach(beforeEach)
test.afterEach.always(afterEach)

// First test
test.serial('litmus get user', async t => {
  const { app } = t.context
  const res = await request(app)
    .get('/litmus')
    .send({email: 'one@example.com'})
  t.is(res.status, 200)
  t.is(res.body.name, 'One')
})

// Second test
// Note: subsequent tests must be serial tests.
// It is NOT RECOMMENDED to run parallel tests within an AVA test file when using Mongoose
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

test.after.always(after)
```

## A demo repo

Here's a [demo repo](https://github.com/zellwk/ava-mdb-test) if you like to see the recipe in action.
