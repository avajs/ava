# ![AVA](media/header.png)

> Simple concurrent test runner

[![Build Status](https://travis-ci.org/sindresorhus/ava.svg?branch=master)](https://travis-ci.org/sindresorhus/ava)

Even though JavaScript is single-threaded, IO in Node.js can happen in parallel due to its async nature. AVA takes advantage of this and runs your tests concurrently, which is especially beneficial for IO heavy tests. [Switching](https://github.com/sindresorhus/pageres/commit/663be15acb3dd2eb0f71b1956ef28c2cd3fdeed0) from Mocha to AVA in Pageres brought the test time down from 31 sec to 11 sec. Having tests run concurrently forces you to write atomic tests, meaning tests that don't depend on global state or the state of other tests, which is a great thing!


## Why AVA?

- Minimal and fast
- Simple test syntax
- Runs tests concurrently
- Enforces writing atomic tests
- [Write your tests in ES2015](#es2015-support)
- [Promise support](#promise-support)
- No implicit globals


## Test syntax

```js
import test from 'ava';

test(t => {
	t.same([1, 2], [1, 2]);
	t.end();
});
```


## Usage

#### Initialize

Simply install AVA globally `$ npm install --global ava` and run `$ ava --init` (with any options) to add AVA to your package.json or create one.

```json
{
	"name": "awesome-package",
	"scripts": {
		"test": "ava"
	},
	"devDependencies": {
		"ava": "^0.2.0"
	}
}
```

#### Create your test file

```js
var test = require('ava');

test('foo', function (t) {
	t.pass();
	t.end();
});

test('bar', function (t) {
	t.plan(2)

	setTimeout(function () {
		t.is('bar', 'bar');
		t.same(['a', 'b'], ['a', 'b']);
	}, 100);
});
```

<img src="screenshot.png" width="150" align="right">

#### Run it

```
$ npm test
```


## CLI

```
$ ava --help

  Usage
    ava <file|folder|glob> [...]

  Options
    --init  Add AVA to your project

  Examples
    ava
    ava test.js test2.js
    ava test-*.js
    ava --init
    ava --init foo.js

  Default patterns when no arguments:
  test.js test-*.js test/*.js
```

Files starting with `_` are ignored. This can be useful for having helpers in the same directory as your test files.


## Documentation

Test files are just normal Node.js scripts and can be run with `$ node test.js`. However, using the CLI is preferred for simplicity, ES2015 support, and future [parallelism support](https://github.com/sindresorhus/ava/issues/1).

Tests are run async and require you to either set planned assertions `t.plan(1)`, explicitly end the test when done `t.end()`, or return a promise.

You have to define all tests synchronously, meaning you can't define a test in the next tick, e.g. inside a `setTimeout`.

### Test anatomy

To create a test, you just call the `test` function you require'd from AVA and pass in an optional test name and a callback function containing the test execution. The passed callback function is given the context as the first argument where you can call the different AVA methods and [assertions](#assertions).

```js
test('name', function (t) {
	t.pass();
	t.end();
});
```

### Optional test name

Naming a test is optional, but you're recommended to use one if you have more than one test.

```js
test(function (t) {
	t.end();
});
```

You can also choose to use a named function instead:

```js
test(function name(t) {
	t.end();
});
```

### Planned assertions

Planned assertions are useful for being able to assert that all async actions happened and catch bugs where too many assertions happen. It also comes with the benefit of not having to manually end the test.

This will result in a passed test:

```js
test(function (t) {
	t.plan(1);

	setTimeout(function () {
		t.pass();
	}, 100);
});
```

And this will result in an error because the code called more assertions than planned:

```js
test(function (t) {
	t.plan(1);

	t.pass();

	setTimeout(function () {
		t.pass();
	}, 100);
});
```

### Promise support

If you return a promise in the test you don't need to explicitly end the test as it will end when the promise resolves.

```js
test(function (t) {
	return somePromise().then(function (result) {
		t.is(result, 'unicorn');
	});
});
```

### Generator function support

AVA supports [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) and  out-of-the-box. 

```js
test(function * (t) {
	const value = yield generatorFn();
	
	t.end();
});
```

### Async function support

AVA also supports [async functions](https://tc39.github.io/ecmascript-asyncawait/) *(async/await)* with no configuration required.

```js
test(async function (t) {
	const value = await promiseFn();

	t.end();
});

// async arrow functions
test(async t => {
	const value = await promiseFn();

	t.end();
});
```

### Serial test execution

While concurrency is awesome, there are some things that can't be done concurrently. In these rare cases, you can call `test.serial`, which will force those tests to run serially before the concurrent ones.

```js
test.serial(function (t) {
	t.end();
});
```


### Before/after hooks

When setup and/or teardown is required, you can use `test.before()` and `test.after()`,
used in the same manner as `test()`. The test function given to `test.before()` and `test.after()` is called before/after all tests.

```js
test.before(function (t) {
	// this test runs before all others
	t.end();
});

test.after(function (t) {
	// this test runs after all others
	t.end();
});

test(function (t) {
	// regular test
	t.end();
});
```


### Custom assertion module

You can use any assertion module instead or in addition to the one that comes with AVA, but you won't be able to use the `.plan()` method, [yet](https://github.com/sindresorhus/ava/issues/25).

```js
var assert = require('assert');

test(function (t) {
	assert(true);
	t.end();
});
```


### ES2015 support

AVA comes with builtin support for ES2015 through [Babel](https://babeljs.io).

Just write your tests in ES2015. No extra work needed.

```js
test(t => {
	t.pass();
	t.end();
});
```

You can also use your own local Babel version:

```json
{
	"devDependencies": {
		"ava": "^0.1.0",
		"babel-core": "^5.8.0"
	}
}
```


## API

### test([name], body)
### test.serial([name], body)
### test.before(body)
### test.after(body)

#### name

Type: `string`

Test name.

#### body(context)

Type: `function`

Should contain the actual test.

##### context

Passed into the test function and contains the different AVA methods and [assertions](#assertions).

###### .plan(count)

Plan how many assertion there are in the test. The test will fail if the actual assertion count doesn't match planned assertions. When planned assertions are used you don't need to explicitly end the test.

Be aware that this doesn't work with custom assert modules. You must then call `.end()` explicitly.

###### .end()

End the test. Use this when `plan()` is not used.


## Assertions

Assertions are mixed into the test [context](#context):

```js
test(function (t) {
	t.ok('unicorn'); // assertion
	t.end();
});
```

### .pass([message])

Passing assertion.

### .fail([message])

Failing assertion.

### .ok(value, [message])

Assert that `value` is truthy.

### .notOk(value, [message])

Assert that `value` is falsy.

### .true(value, [message])

Assert that `value` is `true`.

### .false(value, [message])

Assert that `value` is `false`.

### .is(value, expected, [message])

Assert that `value` is equal to `expected`.

### .not(value, expected, [message])

Assert that `value` is not equal to `expected`.

### .same(value, expected, [message])

Assert that `value` is deep equal to `expected`.

### .notSame(value, expected, [message])

Assert that `value` is not deep equal to `expected`.

### .throws(function, error, [message])

Assert that `function` throws an error.

`error` can be a constructor, regex or validation function.

### .doesNotThrow(function, [message])

Assert that `function` doesn't throw an `error`.

### .regexTest(regex, contents, [message])

Assert that `regex` matches `contents`.

### .ifError(error, [message])

Assert that `error` is falsy.


## Tips

### Temp files

Running tests concurrently comes with some challenges, doing IO is one. Usually, serial tests just create temp directories in the current test directory and cleans it up at the end. This won't work when you run tests concurrently as tests will conflict with each other. The correct way to do it is to use a new temp directory for each test. The [`tempfile`](https://github.com/sindresorhus/tempfile) and [`temp-write`](https://github.com/sindresorhus/temp-write) modules can be helpful.


## FAQ

### Why not `mocha`, `tape`, `node-tap`?

Mocha requires you to use implicit globals like `describe` and `it`, too unopinionated, bloated, synchronous by default, serial test execution, and slow. Tape and node-tap are pretty good. AVA is highly inspired by their syntax. However, they both execute tests serially and they've made [TAP](https://testanything.org) a first-class citizen which has IMHO made their codebases a bit convoluted and coupled. TAP output is hard to read so you always end up using an external tap reporter. AVA is highly opinionated and concurrent. It comes with a default simple reporter and will in the future support TAP through a reporter.

### How is the name written?

AVA. Not Ava or ava.

### What is the header background?

[Andromeda galaxy.](https://simple.wikipedia.org/wiki/Andromeda_galaxy)

### Concurrency vs. parallelism

Concurrency is not parallelism. It enables parallelism. It's about dealing with, while parallelism is about doing, lots of things at once.


## Related

- [gulp-ava](https://github.com/sindresorhus/gulp-ava) - Run tests with gulp
- [grunt-ava](https://github.com/sindresorhus/grunt-ava) - Run tests with grunt


## Created by

[![Sindre Sorhus](https://avatars.githubusercontent.com/u/170270?s=130)](http://sindresorhus.com) | [![Kevin Mårtensson](https://avatars.githubusercontent.com/u/709159?s=130)](https://github.com/kevva) | [![Vadim Demedes](https://avatars.githubusercontent.com/u/697676?s=130)](https://github.com/vdemedes)
---|---|---
[Sindre Sorhus](http://sindresorhus.com) | [Kevin Mårtensson](https://github.com/kevva) | [Vadim Demedes](https://github.com/vdemedes)


<div align="center">
	<br>
	<br>
	<br>
	<img src="https://cdn.rawgit.com/sindresorhus/ava/fe1cea1ca3d2c8518c0cc39ec8be592beab90558/media/logo.svg" width="200" alt="AVA">
	<br>
	<br>
</div>

