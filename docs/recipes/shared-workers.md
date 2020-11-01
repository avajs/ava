# Extending AVA using shared workers

Shared workers are a new, powerful (and experimental) AVA feature. A program can be loaded in a [worker thread](https://nodejs.org/docs/latest/api/worker_threads.html) in AVA's main process and then communicate with code running in the test workers. This enables your tests to better utilize shared resources during a test run, as well as providing opportunities to set up these resources before tests start (or clean them up after).

When you use watch mode, shared workers remain loaded across runs.

## Enabling the experiment

Shared workers are available when you use AVA with Node.js 12.17.0 or newer. AVA 3.13.0 or newer is required. It is an experimental feature so you need to enable it in your AVA configuration:

`ava.config.js`:

```js
export default {
  nonSemVerExperiments: {
    sharedWorkers: true
  }
};
```

## Available plugins

* [`@ava/get-port`](https://github.com/avajs/get-port) works like [`get-port`](https://github.com/sindresorhus/get-port), but ensures the port is locked across all test files.
* [`@ava/cooperate`](https://github.com/avajs/cooperate) implements locking and value reservation functionality.

## Writing plugins

You can write your own plugins. They can be high-level, like [`@ava/get-port`](https://github.com/avajs/get-port) which is built using [`@ava/cooperate`](https://github.com/avajs/cooperate), or low-level like [`@ava/cooperate`](https://github.com/avajs/cooperate) itself.

Here we'll discuss building low-level plugins.

### Registering a shared worker

Plugins are registered inside test workers. They'll provide the path for the main program, which AVA will load in a [worker thread](https://nodejs.org/docs/latest/api/worker_threads.html) in its main process. For each unique path one worker thread is started.

Plugins communicate with their main program using a *protocol*. Protocols are versioned independently from AVA itself. This allows us to make improvements without breaking existing plugins. Protocols are only removed in major AVA releases.

Plugins can be compatible with multiple protocols. AVA will select the best protocol it supports.  If AVA does not support any of the specified protocols it'll throw an error. The selected protocol is available on the returned worker object.

**While shared workers are experimental, there is only an unversioned *experimental* protocol. Breaking changes may occur with any AVA release.**

```js
const {registerSharedWorker} = require('ava/plugin');

const shared = registerSharedWorker({
  filename: path.resolve(__dirname, 'worker.js'),
  supportedProtocols: ['experimental']
});
```

Within a test process you can only register one worker for each `filename`. Filenames are compared as-is, without normalization. If you call `registerSharedWorker()` a second time, the same worker instance is returned.

You can supply a `teardown()` function which will be called after all tests have finished. If you call `registerSharedWorker()` multiple times then the `teardown()` function will be invoked for each registration, even though you only got one worker instance. The most recently registered `teardown()` function is called first, and so forth. `teardown()` functions execute sequentially.

```js
const worker = registerSharedWorker({
  filename: path.resolve(__dirname, 'worker.js'),
  supportedProtocols: ['experimental'],
  teardown () {
    // Perform any clean-up within the test process itself.
  }
});
```

You can also provide some data passed to the main program when it is loaded. Of course, it is only loaded once, so this is only useful in limited circumstances:

```js
const shared = registerSharedWorker({
  filename: path.resolve(__dirname, 'worker.js'),
  initialData: {hello: 'world'},
  supportedProtocols: ['experimental']
});
```

On this `shared` object, `protocol` is set to the selected protocol. Since the main program is loaded asynchronously, `available` provides a promise that fulfils when the main program first becomes available. `currentlyAvailable` reflects whether the worker is, well, currently available.

There are two more methods available on the `shared` object, which we'll get to soon.

#### Initializing the main program

AVA loads the main program (as identified through the `filename` option) in a worker thread. The program must export a factory method. For CJS programs this can be done by assigning `module.exports` or `exports.default`. For ESM programs you must use `export default`. If the `filename` to an ESM program is an absolute path it must be specified using the `file:` protocol.

Like when calling `registerSharedWorker()`, the factory method must negotiate a protocol:

```js
exports.default = ({negotiateProtocol}) => {
  const main = negotiateProtocol(['experimental']);
};
```

On this `main` object, `protocol` is set to the selected protocol. `initialData` holds the data provided when the worker was first registered.

When you're done initializing the main program you must call `main.ready()`. This makes the worker available in test workers. You can call `main.ready()` asynchronously.

Any errors thrown by the factory method will crash the worker thread and make the worker unavailable in test workers. The same goes for unhandled rejections. The factory method may return a promise.

### Communicating between test workers and the worker thread

AVA's low-level shared worker infrastructure is primarily about communication. You can send messages from test workers to the shared worker thread, and the other way around. Higher-level logic can be implemented on top of this message passing infrastructure.

Message data is serialized using the [V8 Serialization API](https://nodejs.org/docs/latest-v12.x/api/v8.html#v8_serialization_api). Please read up on some [important limitations](https://nodejs.org/docs/latest-v12.x/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist).

In the main program you can subscribe to messages from test workers:

```js
exports.default = async ({negotiateProtocol}) => {
  const main = negotiateProtocol(['experimental']).ready();

  for await (const message of main.subscribe()) {
    // …
  }
};
```

Messages have IDs that are unique for the main AVA process. Across AVA runs you may see the same ID. Access the ID using the `id` property.

Access message data using the `data` property.

You can reply to a received message by calling `reply()`. This publishes a message to the test process the message originated from. You can then subscribe to replies to *that* message using `replies()`.

To illustrate this here's a "game" of Marco Polo:

```js
exports.default = ({negotiateProtocol}) => {
  const main = negotiateProtocol(['experimental']).ready();

  play(main.subscribe());
};

const play = async (messages) => {
  for await (const message of messages) {
    if (message.data === 'Marco') {
      const response = message.reply('Polo');
      play(response.replies());
    }
  }
};
```

(Of course this sets up many reply listeners which is rather inefficient.)

You can also broadcast messages to all connected test workers:

```js
exports.default = async ({negotiateProtocol}) => {
  const main = negotiateProtocol(['experimental']).ready();

  for await (const message of main.subscribe()) {
  	if (message.data === 'Bingo!') {
      main.broadcast('Bingo!');
    }
  }
};
```

Like with `reply()`, `broadcast()` returns a published message which can receive replies. Call `replies()` to get an asynchronous iterator for reply messages.

Each received message has a `testWorker` property to represent the test worker that the message originated from. All messages from the same test worker have the same value for this property.

These test workers have a unique ID (which, like message IDs, is unique for the main process). Access it using the `id` property. The path of the test file is available through the `file` property. Use `publish()` to send messages directly to the test worker, and `subscribe()` to receive messages from the test worker. This works the same as `main.subscribe()`.

Of course you don't need to wait for a message *from* a test worker to access this object. Use `main.testWorkers()` to get an asynchronous iterator which produces each newly connected test worker:

```js
exports.default = async ({negotiateProtocol}) => {
  const main = negotiateProtocol(['experimental']).ready();

  for await (const testWorker of main.testWorkers()) {
    main.broadcast(`New test file: ${testWorker.file}`);
  }
};
```

Within test workers, once the shared worker is available, you can publish messages:

```js
shared.publish('Marco');
```

Or subscribe to messages:

```js
(async () => {
  for await (const message of shared.subscribe()) {
    if (message.data === 'Polo') {
      message.reply('Marco');
    }
  }
})();
```

`publish()` throws when the shared worker is not yet available. `publish()` and `subscribe()` throw when the worker has crashed.

Message IDs are available and are unique for the main AVA process.

Messages are always produced in their own turn of the event loop. This means you can use `async`/`await` to process a previous message or subscribe to replies and you'll be guaranteed to receive them.

### Cleaning up resources

Test workers come and go while the worker thread remains. It's therefore important to clean up resources.

Messages are subscribed to using async iterators. These return when the test worker exits.

You can register teardown functions to be run when the test worker exits:

```js
exports.default = async ({negotiateProtocol}) => {
  const main = negotiateProtocol(['experimental']).ready();

  for await (const testWorker of main.testWorkers()) {
    testWorker.teardown(() => {
      // Bye bye…
    });
  }
};
```

The most recently registered function is called first, and so forth. Functions execute sequentially.

More interestingly, a wrapped teardown function is returned so that you can call it manually. AVA still ensures the function only runs once.

```js
exports.default = ({negotiateProtocol}) => {
  const main = negotiateProtocol(['experimental']).ready();

  for await (const worker of testWorkers) {
    counters.set(worker, 0);
    const teardown = worker.teardown(() => {
      counters.delete(worker);
    });

    waitForTen(worker.subscribe(), teardown);
  }
};

const counters = new WeakMap();

const waitForTen = async (messages, teardown) => {
  for await (const {testWorker} of messages) {
    const count = counters.get(testWorker) + 1;
    if (count === 10) {
      teardown();
    } else {
      counters.set(testWorker, count);
    }
  }
};
```

## Now it's your turn

We're pretty excited about this feature! But we need more real-world experience in building AVA plugins before we can make it generally available. Please give feedback and build plugins. We'd be more than happy to promote them.

Not sure what to build? Previously folks have expressed a desire for mutexes, managing Puppeteer instances, starting (database) servers and so forth.

We could also extend the shared worker implementation in AVA itself. Perhaps so you can run code before a new test run, even with watch mode. Or so you can initialize a shared worker based on the AVA configuration, not when a test file runs.

Please [comment here](https://github.com/avajs/ava/issues/2605) with ideas, questions and feedback.
