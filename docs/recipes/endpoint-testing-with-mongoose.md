When you test endpoints, you'd want to test the same code you use for production as much as possible. This recipe helps you set up endpoint testing with a different mongoose database per test file.

Note that AVA doesn't have a built-in method for testing endpoints, but you can use libraries like [`supertest`](https://github.com/visionmedia/supertest) to help you with it.

## Setting up

This recipe uses the following libraries:

1. Mongomem (A MongoDB in-memory Server)
2. Supertest (An endpoint testing library)
3. Mongoose

Install the libraries by running the following code:

```console
$ npm install --save-dev mongomem supertest
```

## Your test file

**First, include all libraries you're going to use:**

```js
import test from 'ava'
import request from 'supertest'
import { MongoDBServer } from 'mongomem'
// Optionally, import your models here too
```

**Next, start your MongoDB instance with Mongomem**

```js
test.before('start server', async t => MongoDBServer.start())
```

**For each test you run, you need to configure a new Express instance** that connects to a different MongoDB URL. Make sure you add your server only after Mongoose is started.

```js
const setupMongoose = async _ => {
  await mongoose.connect(await MongoDBServer.getConnectionString())
  return mongoose
}

test.beforeEach(async t => {
  const db = await setupMongoose()
  const app = require('./server')

  // Setup any fixtures you need here. This is a placeholder code
  await setupFixtures()

  // Pass app and mongoose into your tests
  t.context.app = app
  t.context.db = db
})
```

Your server file may resemble the following. In this file, you cannot use `app.listen` to start your app. (Export it to another file and call `app.listen` there).

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

app.use('/', routes)

module.exports = app
```

**After each test, you need to clear your fixtures and disconnect the Mongoose server**:

```js
// use .always to help with teardown
test.afterEach.always(async t => {
  const { db } = t.context
  // Note: removeFixtures is a placeholder. Write your own
  await removeFixtures()
  await db.connection.close()
})
```

**Next, you write your tests**.

Since you're opening and closing mongose connections per test, make sure your tests run serially in this file. Here, you get get your express app from `t.context.app` (we did this step in `beforeEach`). Then, simply use `app` in supertest as follows:

```js
// Note the serial tests
test.serial('litmus get test', async t => {
  const { app } = t.context
  const res = await request(app)
    .get('/test1')
    .send({
      email: 'example@example.com'
    })
  t.is(res.status, 200)
  t.is(res.body.name, `somename`)
})

test.serial('litmus post test', async t => {
  const { app } = t.context
  const res = await request(app)
    .post('/test2')
    .send({
      email: 'example@example.com'
      name: `A random name`
    })
  t.is(res.status, 200)
  t.is(res.body.name, 'A random name')
})
```

**After you're done with all your tests, close your MongoDB Server**:

```js
test.after.always('cleanup', t => MongoDBServer.tearDown())
```

And you're done! :)
