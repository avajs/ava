# Common Pitfalls

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/08-common-pitfalls.md)

If you use [ESLint](https://eslint.org), you can install [eslint-plugin-ava](https://github.com/avajs/eslint-plugin-ava). It will help you use AVA correctly and avoid some common pitfalls.

## Error edge cases

The `throws()` and `throwsAsync()` assertions use the Node.js built-in [`isNativeError()`](https://nodejs.org/api/util.html#utiltypesisnativeerrorvalue) to determine whether something is an error. This only recognizes actual instances of `Error` (and subclasses).

Note that the following is not a native error:

```js
const error = Object.create(Error.prototype);
```

This can be surprising, since `error instanceof Error` returns `true`. You can set `any: true` in the expectations to handle these values:

```js
const error = Object.create(Error.prototype);
t.throws(() => { throw error }, {any: true});
```

## AVA in Docker

If you run AVA in Docker as part of your CI, you need to fix the appropriate environment variables. Specifically, adding `-e CI=true` in the `docker exec` command. See [#751](https://github.com/avajs/ava/issues/751).

AVA uses [is-ci](https://github.com/watson/is-ci) to decide if it's in a CI environment or not using [these variables](https://github.com/watson/ci-info/blob/master/index.js).

## AVA and connected client limits

You may be using a service that only allows a limited number of concurrent connections. For example, many database-as-a-service businesses offer a free plan with a limit on how many clients can be using it at the same time. AVA can hit those limits as it runs multiple processes, but well-written services should emit an error or throttle in those cases. If the one you're using doesn't, the tests will hang.

By default, AVA will use as many processes as there are [logical cores](https://superuser.com/questions/1105654/logical-vs-physical-cpu-performance) on your machine. This is capped at two in a CI environment.

Use the `concurrency` flag to limit the number of processes ran. For example, if your service plan allows 5 clients, you should run AVA with `concurrency=5` or less.

## Asynchronous operations

You may be running an asynchronous operation inside a test and wondering why it's not finishing. If your asynchronous operation uses promises, you should return the promise:

```js
test('fetches foo', t => {
	return fetch().then(data => {
		t.is(data, 'foo');
	});
});
```

Better yet, use `async` / `await`:

```js
test('fetches foo', async t => {
	const data = await fetch();
	t.is(data, 'foo');
});
```

If you're using callbacks, promisify the callback function using something like [`util.promisify()`](https://nodejs.org/dist/latest/docs/api/util.html#util_util_promisify_original):

```js
import {promisify} from 'util';

test('fetches foo', async t => {
	const data = await promisify(fetch)();
	t.is(data, 'foo');
});
```

## Attributing uncaught exceptions to tests

AVA [can't trace uncaught exceptions](https://github.com/avajs/ava/issues/214) back to the test that triggered them. Callback-taking functions may lead to uncaught exceptions that can then be hard to debug. Consider promisifying and using `async`/`await`, as in the above example. This should allow AVA to catch the exception and attribute it to the correct test.

## Node.js command line options, child processes and worker threads

By default AVA runs test files in worker threads. However, not all Node.js command line options (those that end up in [`process.execArgv`](https://nodejs.org/api/process.html#processexecargv)) are compatible with worker threads. You may get an error like this:

```
Error [ERR_WORKER_INVALID_EXEC_ARGV]: Initiated Worker with invalid execArgv flags: --title
```

If possible don't specify the command line option when running AVA. Alternatively you could [disable worker threads in AVA](./06-configuration.md#options).

## Timeouts because a file failed to exit

You may get a "Timed out while running tests" error because AVA failed to exit when running a particular file.

AVA waits for Node.js to exit the worker thread or child process. If this takes too long, AVA counts it as a timeout.

It is best practice to make sure your code exits cleanly. We've also seen occurrences where an explicit `process.exit()` call inside a worker thread could not be observed in AVA's main process.

For these reasons we're not providing an option to disable this timeout behavior. However, it is possible to register a callback for when AVA has completed the test run without uncaught exceptions or unhandled rejections. From inside this callback you can do whatever you need to do, including calling `process.exit()`.

Create a `_force-exit.mjs` file:

```js
import process from 'node:process';
import { registerCompletionHandler } from 'ava';

registerCompletionHandler(() => {
	process.exit();
});
```

Completion handlers are invoked in order of registration. Results are not awaited.

Load it for all test files through AVA's `require` option:

```js
export default {
	require: ['./_force-exit.mjs'],
};
```

## Sharing variables between asynchronous tests

By default AVA executes tests concurrently. This can cause problems if your tests are asynchronous and share variables.

Take this contrived example:

```js
import test from 'ava';

let count = 0;
const incr = async () => {
	await true;
	count = count + 1;
};

test.beforeEach('reset the count', () => {
	count = 0;
});

test('increment once', async t => {
	await incr();
	t.is(count, 1);
});

test('increment twice', async t => {
	await incr();
	await incr();
	t.is(count, 2);
});
```

Concurrent tests allow for asynchronous tests to execute more quickly, but if they rely on shared state this may lead to unexpected test failures. If the shared state cannot be avoided, you can execute your tests serially:

```js
import test from 'ava';

let count = 0;
const incr = async () => {
	await true;
	count = count + 1;
};

test.beforeEach('reset the count', () => {
	count = 0;
});

test.serial('increment once', async t => {
	await incr();
	t.is(count, 1);
});

test.serial('increment twice', async t => {
	await incr();
	await incr();
	t.is(count, 2);
});
```

---

Is your problem not listed here? Submit a pull request or comment on [this issue](https://github.com/avajs/ava/issues/404).
