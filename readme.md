# ![AVA](media/header.png)

> Simple concurrent test runner

[![Build Status](https://travis-ci.org/sindresorhus/ava.svg?branch=master)](https://travis-ci.org/sindresorhus/ava)

Even though JavaScript is single-threaded, IO in Node.js can happen in parallel due to its async nature. AVA takes advantage of this and runs your tests concurrently, which is especially beneficial for IO heavy tests. [Switching](https://github.com/sindresorhus/pageres/commit/663be15acb3dd2eb0f71b1956ef28c2cd3fdeed0) from Mocha to AVA in Pageres brought the test time down from 31 sec to 11 sec. Having tests run concurrently forces you to write atomic tests, meaning tests that don't depend on global state or the state of other tests, which is a great thing!


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


## Documentation

Test files are just normal Node.js scripts and can be run with `$ node test.js`. However, using the CLI is preferred for simplicity and future [parallelism support](https://github.com/sindresorhus/ava/issues/1).

Tests are run async and require you to either set planned assertions `t.plan(1)`, explicitly end the test when done `t.end()`, or return a promise.

You have to define all tests synchronously, meaning you can't define a test in the next tick, e.g. inside a `setTimeout`.

### Test anatomy

To create a test, you just call the `test` function you require'd from AVA and pass in an optional test name and a callback function containing the test execution. The passed callback function is given the context as the first argument where you can call the different AVA methods and assertions.

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


### Serial test execution

While concurrency is awesome, there are some things that can't be done concurrently. In these rare cases, you can call `test.serial`, which will force those tests to run serially before the concurrent ones.

```js
test.serial(function (t) {
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

You can write your tests in ES2015:

```js
test(t => {
	t.pass();
	t.end();
});
```

And run it in any node version.

```sh
$ ava
```

Also you can use your local `babel` or `babel-core` instead of built-in.

For example, package.json:

```json
{
	"devDependencies": {
		"ava": "^0.1.0",
		"babel": "^5.8.0"
	},
	"scripts": {
		"test": "ava"
	}
}
```


## API

### test([name], body)
### test.serial([name], body)

#### name

Type: `string`

Test name.

#### body(context)

Type: `function`

Should contain the actual test.

##### context

Passed into the test function and contains the different AVA methods and assertions.

See the [`claim` docs](https://github.com/kevva/claim#api) for supported assertions.

###### plan(count)

Plan how many assertion there are in the test. The test will fail if the actual assertion count doesn't match planned assertions. When planned assertions are used you don't need to explicitly end the test.

Be aware that this doesn't work with custom assert modules. You must then call `.end()` explicitly.

###### end()

End the test. Use this when `plan()` is not used.


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


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)


<div align="center">
	<br>
	<br>
	<br>
	<img src="https://cdn.rawgit.com/sindresorhus/ava/fe1cea1ca3d2c8518c0cc39ec8be592beab90558/media/logo.svg" width="200" alt="AVA">
	<br>
	<br>
</div>

