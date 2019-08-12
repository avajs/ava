# Common Pitfalls

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/08-common-pitfalls.md)

## ESLint plugin

If you use [ESLint](http://eslint.org/), you can install [eslint-plugin-ava](https://github.com/avajs/eslint-plugin-ava). It will help you use AVA correctly and avoid some common pitfalls.

### Transpiling imported modules

AVA currently only transpiles test and helper files. *It will not transpile modules you `import` from outside of the test.* This may be unexpected but there are workarounds.

If you use Babel you can use its [require hook](https://babeljs.io/docs/usage/require/) to transpile imported modules on-the-fly. To add it, [configure it in your `package.json`](./06-configuration.md).

You can also transpile your modules in a separate process and refer to the transpiled files rather than the sources from your tests.

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

If you're using callbacks, use [`test.cb`](./01-writing-tests.md#callback-support):

```js
test.cb('fetches foo', t => {
	fetch((err, data) => {
		t.is(data, 'foo');
		t.end();
	});
});
```

Alternatively, promisify the callback function using something like [`pify`](https://github.com/sindresorhus/pify):

```js
test('fetches foo', async t => {
	const data = await pify(fetch)();
	t.is(data, 'foo');
});
```

### Attributing uncaught exceptions to tests

AVA [can't trace uncaught exceptions](https://github.com/avajs/ava/issues/214) back to the test that triggered them. Callback-taking functions may lead to uncaught exceptions that can then be hard to debug. Consider promisifying and using `async`/`await`, as in the above example. This should allow AVA to catch the exception and attribute it to the correct test.

### Why are the enhanced assertion messages not shown?

Ensure that the first parameter passed into your test is named `t`. This is a requirement of [`power-assert`](https://github.com/power-assert-js/power-assert), the library that provides the [enhanced messages](./03-assertions.md#enhanced-assertion-messages).

```js
test('one is one', t => {
	t.assert(1 === 1);
});
```

### Why global variables are not reset before tests?

By default AVA runs tests concurrently, this doesn't alter the order test hooks like `beforeEach` and `afterEach` are executed, but could lead to tests having _polluted_ global variables.

```js
import test from 'ava';
import addOne from './src/index.js';

global.acum = 0;

test.beforeEach(() => {
	// reset global
	global.acum = 0;
});

test.beforeEach(() => {
	global.acum = null;
});

test('modifies global variable', t => {
	acum = addOne(acum);
	t.assert(acum, 1);
});

test('could fail because of concurrent execution', t => {
	acum = addOne(addOne(acum));
	t.assert(acum, 2);
});
```

Concurrent tests allow a faster test suite excution, but if they rely on globals been cleaned after each case, then is recommended to use `serial` execution.


```diff
- import test from 'ava';
+ import { serial as test } from 'ava';
import addOne from './src/index.js';

global.acum = 0;

test.beforeEach(() => {
	// reset global
	global.acum = 0;
});

test.beforeEach(() => {
	global.acum = null;
});

test('modifies global variable', t => {
	acum = addOne(acum);
	t.assert(acum, 1);
});

test('could fail because of concurrent execution', t => {
	acum = addOne(addOne(acum));
	t.assert(acum, 2);
});
```

---

Is your problem not listed here? Submit a pull request or comment on [this issue](https://github.com/avajs/ava/issues/404).
