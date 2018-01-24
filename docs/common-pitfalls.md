# Common Pitfalls

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/common-pitfalls.md)

## ESLint plugin

If you use [ESLint](http://eslint.org/), you can install [eslint-plugin-ava](https://github.com/avajs/eslint-plugin-ava). It will help you use AVA correctly and avoid some common pitfalls.

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
test(t => {
	return fetch().then(data => {
		t.is(data, 'foo');
	});
});
```

Better yet, use `async` / `await`:

```js
test(async t => {
	const data = await fetch();
	t.is(data, 'foo');
});
```

If you're using callbacks, use [`test.cb`](https://github.com/avajs/ava#callback-support):

```js
test.cb(t => {
	fetch((err, data) => {
		t.is(data, 'foo');
		t.end();
	});
});
```

Alternatively, promisify the callback function using something like [`pify`](https://github.com/sindresorhus/pify):

```js
test(async t => {
	const data = await pify(fetch)();
	t.is(data, 'foo');
});
```

### Attributing uncaught exceptions to tests

AVA [can't trace uncaught exceptions](https://github.com/avajs/ava/issues/214) back to the test that triggered them. Callback-taking functions may lead to uncaught exceptions that can then be hard to debug. Consider promisifying and using `async`/`await`, as in the above example. This should allow AVA to catch the exception and attribute it to the correct test.

### Why are the enhanced assertion messages not shown?

Ensure that the first parameter passed into your test is named `t`. This is a requirement of [`power-assert`](https://github.com/power-assert-js/power-assert), the library that provides the enhanced messages.

```js
test(t => {
	t.is(1, 1);
});
```

### Helpers are not compiled when using a non-default test folder

This is a [known issue](https://github.com/avajs/ava/issues/1319). You should put your tests in a folder called `test` or `__tests__`.

---

Is your problem not listed here? Submit a pull request or comment on [this issue](https://github.com/avajs/ava/issues/404).
