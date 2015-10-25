# ![AVA](media/header.png)

> Futuristic test runner

[![Build Status](https://travis-ci.org/sindresorhus/ava.svg?branch=master)](https://travis-ci.org/sindresorhus/ava) [![Coverage Status](https://coveralls.io/repos/sindresorhus/ava/badge.svg?branch=master&service=github)](https://coveralls.io/github/sindresorhus/ava?branch=master)

Even though JavaScript is single-threaded, IO in Node.js can happen in parallel due to its async nature. AVA takes advantage of this and runs your tests concurrently, which is especially beneficial for IO heavy tests. In addition, test files are run in parallel as separate processes, giving you even better performance and a isolated environment for each test file. [Switching](https://github.com/sindresorhus/pageres/commit/663be15acb3dd2eb0f71b1956ef28c2cd3fdeed0) from Mocha to AVA in Pageres brought the test time down from 31 sec to 11 sec. Having tests run concurrently forces you to write atomic tests, meaning tests that don't depend on global state or the state of other tests, which is a great thing!


## Why AVA?

- Minimal and fast
- Simple test syntax
- Runs test files in parallel
- Runs tests concurrently
- Enforces writing atomic tests
- No implicit globals
- [Isolated environment for each test file](#isolated-environment)
- [Write your tests in ES2015](#es2015-support)
- [Promise support](#promise-support)
- [Generator function support](#generator-function-support)
- [Async function support](#async-function-support)
- [Enhanced asserts](#enhanced-asserts)


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

Install AVA globally `$ npm install --global ava` and run `$ ava --init` (with any options) to add AVA to your package.json or create one.

```json
{
	"name": "awesome-package",
	"scripts": {
		"test": "ava"
	},
	"devDependencies": {
		"ava": "^0.3.0"
	}
}
```

#### Create your test file

```js
import test from 'ava';

test('foo', t => {
	t.pass();
	t.end();
});

test('bar', t => {
	t.plan(2);

	setTimeout(() => {
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
    ava [<file|folder|glob> ...]

  Options
    --init       Add AVA to your project
    --fail-fast  Stop after first test failure
    --serial     Run tests serially

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

Tests are run async and require you to either set planned assertions `t.plan(1)`, explicitly end the test when done `t.end()`, or return a promise. [Async functions](#async-function-support) already returns a promise implicitly, so no need for you to explicitly return a promise in that case.

You have to define all tests synchronously, meaning you can't define a test in the next tick, e.g. inside a `setTimeout`.

Test files are run from their current directory, so [`process.cwd()`](https://nodejs.org/api/process.html#process_process_cwd) is always the same as [`__dirname`](https://nodejs.org/api/globals.html#globals_dirname). You can just use relative paths instead of doing `path.join(__dirname, 'relative/path')`.

### Test anatomy

To create a test, you call the `test` function you require'd from AVA and pass in an optional test name and a function containing the test execution. The passed function is given the context as the first argument, where you can call the different AVA methods and [assertions](#assertions).

```js
test('name', t => {
	t.pass();
	t.end();
});
```

### Optional test name

Naming a test is optional, but you're recommended to use one if you have more than one test.

```js
test(t => {
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
test(t => {
	t.plan(1);

	setTimeout(() => {
		t.pass();
	}, 100);
});
```

And this will result in an error because the code called more assertions than planned:

```js
test(t => {
	t.plan(1);

	t.pass();

	setTimeout(() => {
		t.pass();
	}, 100);
});
```

### Serial test execution

While concurrency is awesome, there are some things that can't be done concurrently. In these rare cases, you can call `test.serial`, which will force those tests to run serially before the concurrent ones.

```js
test.serial(t => {
	t.end();
});
```

### Before & after hooks

When setup and/or teardown is required, you can use `test.before()` and `test.after()`,
used in the same manner as `test()`. The test function given to `test.before()` and `test.after()` is called before/after all tests. You can also use `test.beforeEach()` and `test.afterEach()` if you need setup/teardown for each test. Hooks are run serially in the test file. Add as many of these as you want.

```js
test.before(t => {
	// this runs before all tests
	t.end();
});

test.before(t => {
	// this runs after the above, but before tests
	t.end();
});

test.after(t => {
	// this runs after all tests
	t.end();
});

test.beforeEach(t => {
	// this runs before each test
	t.end();
});

test.afterEach(t => {
	// this runs after each test
	t.end();
});

test(t => {
	// regular test
	t.end();
});
```

### Custom assertion module

You can use any assertion module instead or in addition to the one that comes with AVA, but you won't be able to use the `.plan()` method, [yet](https://github.com/sindresorhus/ava/issues/25).

```js
import assert from 'assert';

test(t => {
	assert(true);
	t.end();
});
```

### ES2015 support

AVA comes with builtin support for ES2015 through [Babel](https://babeljs.io).

Just write your tests in ES2015. No extra setup needed.

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
		"ava": "^0.3.0",
		"babel-core": "^5.8.0"
	}
}
```

### Promise support

If you return a promise in the test you don't need to explicitly end the test as it will end when the promise resolves.

```js
test(t => {
	return somePromise().then(result => {
		t.is(result, 'unicorn');
	});
});
```

### Generator function support

AVA comes with builtin support for [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*).

```js
test(function * (t) {
	const value = yield generatorFn();
	t.true(value);
});
```

*You don't have to manually call `t.end()`.*


### Async function support

AVA comes with builtin support for [async functions](https://tc39.github.io/ecmascript-asyncawait/) *(async/await)*.

```js
test(async function (t) {
	const value = await promiseFn();
	t.true(value);
});

// async arrow function
test(async t => {
	const value = await promiseFn();
	t.true(value);
});
```

*You don't have to manually call `t.end()`.*


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
test(t => {
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

### .throws(function|promise, error, [message])

Assert that `function` throws an error or `promise` rejects.

`error` can be a constructor, regex or validation function.

### .doesNotThrow(function|promise, [message])

Assert that `function` doesn't throw an `error` or `promise` resolves.

### .regexTest(regex, contents, [message])

Assert that `regex` matches `contents`.

### .ifError(error, [message])

Assert that `error` is falsy.


## Enhanced asserts

AVA comes with [`power-assert`](https://github.com/power-assert-js/power-assert) builtin, giving you more descriptive assertion messages. It reads your test and tries to infer more information from the code.

The following test:

```js
test(t => {
	const foo = 'foo';
	t.ok(foo === 'bar');
	t.end();
});
```

Would normally give the unhelpful output:

```
false === true
```

With the enhanced asserts, you'll get:

```
t.ok(foo === 'bar')
       |
       "foo"
```

True, you could use `t.is()` in this case, and probably should, but this is just a simple example.

Let try a more advanced example:

```js
test(t => {
	const a = /foo/;
	const b = 'bar';
	const c = 'baz';
	t.ok(a.test(b) || b === c);
	t.end();
});
```

And there you go:

```
t.ok(a.test(b) || b === c)
       |    |     |     |
       |    "bar" "bar" "baz"
       false
```

All the assert methods are enhanced.

Have fun!


## Isolated environment

Each test file is run in a separate Node.js process. This comes with a lot of benefits. Different test files can no longer affect each other. Like test files mocking with the global environment, overriding builtins, etc. However, it's mainly done for performance reasons. Even though Node.js can run async IO concurrently, that doesn't help much when tests are heavy on synchronous operations, which blocks the main thread. By running tests concurrently and test files in parallel we take full advantage of modern systems.


## Tips

### Temp files

Running tests concurrently comes with some challenges, doing IO is one. Usually, serial tests just create temp directories in the current test directory and cleans it up at the end. This won't work when you run tests concurrently as tests will conflict with each other. The correct way to do it is to use a new temp directory for each test. The [`tempfile`](https://github.com/sindresorhus/tempfile) and [`temp-write`](https://github.com/sindresorhus/temp-write) modules can be helpful.

### Debugging

AVA runs tests concurrently by default, which is suboptimal when you need to debug something. Instead, run tests serially with the `--serial` option:

```
$ ava --serial
```


## FAQ

### Why not `mocha`, `tape`, `node-tap`?

Mocha requires you to use implicit globals like `describe` and `it`, too unopinionated, bloated, synchronous by default, serial test execution, and slow. Tape and node-tap are pretty good. AVA is highly inspired by their syntax. However, they both execute tests serially and they've made [TAP](https://testanything.org) a first-class citizen which has IMHO made their codebases a bit convoluted and coupled. TAP output is hard to read so you always end up using an external tap reporter. AVA is highly opinionated and concurrent. It comes with a default simple reporter and will in the future support TAP through a reporter.

### How is the name written and pronounced?

AVA, not Ava or ava. Pronounced [`/ˈeɪvə/` ay-və](media/pronunciation.m4a?raw=true).

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

