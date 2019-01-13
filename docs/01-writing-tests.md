# Writing tests

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/01-writing-tests.md)

Tests are run concurrently. You can specify synchronous and asynchronous tests. Tests are considered synchronous unless you return a promise, an [observable](https://github.com/zenparsing/zen-observable), or declare it as a callback test.

You must define all tests synchronously. They can't be defined inside `setTimeout`, `setImmediate`, etc.

AVA tries to run test files with their current working directory set to the directory that contains your `package.json` file.

## Process isolation

Each test file is run in a separate Node.js process. This allows you to change the global state or overriding a built-in in one test file, without affecting another. It's also great for performance on modern multi-core processors, allowing multiple test files to execute in parallel.

AVA will set `process.env.NODE_ENV` to `test`, unless the `NODE_ENV` environment variable has been set. This is useful if the code you're testing has test defaults (for example when picking what database to connect to, or environment-specific Babel options). It may cause your code or its dependencies to behave differently though. Note that `'NODE_ENV' in process.env` will always be `true`.

## Declaring tests

To declare a test you call the `test` function you imported from AVA. Provide the required title and implementation function. Titles must be unique within each test file. The function will be called when your test is run. It's passed an [execution object](./02-execution-context.md) as its first argument.

**Note:** In order for the [enhanced assertion messages](./03-assertions.md#enhanced-assertion-messages) to behave correctly, the first argument **must** be named `t`.

```js
import test from 'ava';

test('my passing test', t => {
	t.pass();
});
```

## Running tests serially

Tests are run concurrently by default, however, sometimes you have to write tests that cannot run concurrently. In these rare cases you can use the `.serial` modifier. It will force those tests to run serially *before* the concurrent ones.

```js
test.serial('passes serially', t => {
	t.pass();
});
```

Note that this only applies to tests within a particular test file. AVA will still run multiple tests files at the same time unless you pass the [`--serial` CLI flag](./05-command-line.md).

You can use the `.serial` modifier with all tests, hooks and even `.todo()`, but it's only available on the `test` function.

## Promise support

Tests may return a promise. AVA will wait for the promise to resolve before ending the test. If the promise rejects the test will fail.

```js
test('resolves with unicorn', t => {
	return somePromise().then(result => {
		t.is(result, 'unicorn');
	});
});
```

## Async function support

AVA comes with built-in support for [async functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function).

```js
test(async function (t) {
	const value = await promiseFn();
	t.true(value);
});

// Async arrow function
test('promises the truth', async t => {
	const value = await promiseFn();
	t.true(value);
});
```

## Observable support

AVA comes with built-in support for [observables](https://github.com/zenparsing/es-observable). If you return an observable from a test, AVA will automatically consume it to completion before ending the test.

*You do not need to use "callback mode" or call `t.end()`.*

```js
test('handles observables', t => {
	t.plan(3);
	return Observable.of(1, 2, 3, 4, 5, 6)
		.filter(n => {
			// Only even numbers
			return n % 2 === 0;
		})
		.map(() => t.pass());
});
```

## Callback support

AVA supports using `t.end` as the final callback when using Node.js-style error-first callback APIs. AVA will consider any truthy value passed as the first argument to `t.end` to be an error. Note that `t.end` requires "callback mode", which can be enabled by using the `test.cb` chain.

```js
test.cb('data.txt can be read', t => {
	// `t.end` automatically checks for error as first argument
	fs.readFile('data.txt', t.end);
});
```

## Running specific tests

During development it can be helpful to only run a few specific tests. This can be accomplished using the `.only` modifier:

```js
test('will not be run', t => {
	t.fail();
});

test.only('will be run', t => {
	t.pass();
});
```

You can use the `.only` modifier with all tests. It cannot be used with hooks or `.todo()`.

*Note:* The `.only` modifier applies to the test file it's defined in, so if you run multiple test files, tests in other files will still run. If you want to only run the `test.only` test, provide just that test file to AVA.

## Skipping tests

Sometimes failing tests can be hard to fix. You can tell AVA to skip these tests using the `.skip` modifier. They'll still be shown in the output (as having been skipped) but are never run.

```js
test.skip('will not be run', t => {
	t.fail();
});
```

You must specify the implementation function. You can use the `.skip` modifier with all tests and hooks, but not with `.todo()`. You can not apply further modifiers to `.skip`.

## Test placeholders ("todo")

You can use the `.todo` modifier when you're planning to write a test. Like skipped tests these placeholders are shown in the output. They only require a title; you cannot specify the implementation function.

```js
test.todo('will think about writing this later');
```

You can signal that you need to write a serial test:

```js
test.serial.todo('will think about writing this later');
```

## Failing tests

You can use the `.failing` modifier to document issues with your code that need to be fixed. Failing tests are run just like normal ones, but they are expected to fail, and will not break your build when they do. If a test marked as failing actually passes, it will be reported as an error and fail the build with a helpful message instructing you to remove the `.failing` modifier.

This allows you to merge `.failing` tests before a fix is implemented without breaking CI. This is a great way to recognize good bug report PR's with a commit credit, even if the reporter is unable to actually fix the problem.

```js
// See: github.com/user/repo/issues/1234
test.failing('demonstrate some bug', t => {
	t.fail(); // Test will count as passed
});
```

## Before & after hooks

AVA lets you register hooks that are run before and after your tests. This allows you to run setup and/or teardown code.

`test.before()` registers a hook to be run before the first test in your test file. Similarly `test.after()` registers a hook to be run after the last test. Use `test.after.always()` to register a hook that will **always** run once your tests and other hooks complete. `.always()` hooks run regardless of whether there were earlier failures, so they are ideal for cleanup tasks. Note however that uncaught exceptions, unhandled rejections or timeouts will crash your tests, possibly preventing `.always()` hooks from running.

`test.beforeEach()` registers a hook to be run before each test in your test file. Similarly `test.afterEach()` a hook to be run after each test. Use `test.afterEach.always()` to register an after hook that is called even if other test hooks, or the test itself, fail.

If a test is skipped with the `.skip` modifier, the respective `.beforeEach()`, `.afterEach()` and `.afterEach.always()` hooks are not run. Likewise, if all tests in a test file are skipped `.before()`, `.after()` and `.after.always()` hooks for the file are not run.

Like `test()` these methods take an optional title and an implementation function. The title is shown if your hook fails to execute. The implementation is called with an [execution object](./02-execution-context.md). You can use assertions in your hooks. You can also pass a [macro function](#reusing-test-logic-through-macros) and additional arguments.

`.before()` hooks execute before `.beforeEach()` hooks. `.afterEach()` hooks execute before `.after()` hooks. Within their category the hooks execute in the order they were defined. By default hooks execute concurrently, but you can use `test.serial` to ensure only that single hook is run at a time. Unlike with tests, serial hooks are *not* run before other hooks:

```js
test.before(t => {
	// This runs before all tests
});

test.before(t => {
	// This runs concurrently with the above
});

test.serial.before(t => {
	// This runs after the above
});

test.serial.before(t => {
	// This too runs after the above, and before tests
});

test.after('cleanup', t => {
	// This runs after all tests
});

test.after.always('guaranteed cleanup', t => {
	// This will always run, regardless of earlier failures
});

test.beforeEach(t => {
	// This runs before each test
});

test.afterEach(t => {
	// This runs after each test
});

test.afterEach.always(t => {
	// This runs after each test and other test hooks, even if they failed
});

test('title', t => {
	// Regular test
});
```

Hooks can be synchronous or asynchronous, just like tests. To make a hook asynchronous return a promise or observable, use an async function, or enable callback mode via `test.before.cb()`, `test.beforeEach.cb()` etc.

```js
test.before(async t => {
	await promiseFn();
});

test.after(t => {
	return new Promise(/* ... */);
});

test.beforeEach.cb(t => {
	setTimeout(t.end);
});

test.afterEach.cb(t => {
	setTimeout(t.end);
});
```

Keep in mind that the `.beforeEach()` and `.afterEach()` hooks run just before and after a test is run, and that by default tests run concurrently. This means each multiple `.beforeEach()` hooks may run concurrently. Using `test.serial.beforeEach()` does not change this. If you need to set up global state for each test (like spying on `console.log` [for example](https://github.com/avajs/ava/issues/560)), you'll need to make sure the tests themselves are [run serially](#running-tests-serially).

Remember that AVA runs each test file in its own process. You may not have to clean up global state in a `.after()`-hook since that's only called right before the process exits.

## Test context

Hooks can share context with the test:

```js
test.beforeEach(t => {
	t.context.data = generateUniqueData();
});

test('context data is foo', t => {
	t.is(t.context.data + 'bar', 'foobar');
});
```

Context created in `.before()` hooks is [cloned](https://www.npmjs.com/package/lodash.clone) before it is passed to `.beforeEach()` hooks and / or tests. The `.after()` and `.after.always()` hooks receive the original context value.

For `.beforeEach()`, `.afterEach()` and `.afterEach.always()` hooks the context is *not* shared between different tests, allowing you to set up data such that it will not leak to other tests.

By default `t.context` is an object but you can reassign it:

```js
test.before(t => {
	t.context = 'unicorn';
});

test('context is unicorn', t => {
	t.is(t.context, 'unicorn');
});
```

## Retrieving test meta data

Helper files can determine the filename of the test being run by reading `test.meta.file`.  This eliminates the need to pass `__filename` from the test to helpers.

```js
import test from 'ava';

console.log('Test currently being run: ', test.meta.file);
```

## Reusing test logic through macros

Additional arguments passed to the test declaration will be passed to the test implementation. This is useful for creating reusable test macros.

```js
function macro(t, input, expected) {
	t.is(eval(input), expected);
}

test('2 + 2 = 4', macro, '2 + 2', 4);
test('2 * 3 = 6', macro, '2 * 3', 6);
```

You can build the test title programmatically by attaching a `title` function to the macro:

```js
function macro(t, input, expected) {
	t.is(eval(input), expected);
}

macro.title = (providedTitle = '', input, expected) => `${providedTitle} ${input} = ${expected}`.trim();

test(macro, '2 + 2', 4);
test(macro, '2 * 3', 6);
test('providedTitle', macro, '3 * 3', 9);
```

The `providedTitle` argument defaults to `undefined` if the user does not supply a string title. This means you can use a parameter assignment to set the default value. The example above uses the empty string as the default.

You can also pass arrays of macro functions:

```js
const safeEval = require('safe-eval');

function evalMacro(t, input, expected) {
	t.is(eval(input), expected);
}

function safeEvalMacro(t, input, expected) {
	t.is(safeEval(input), expected);
}

test([evalMacro, safeEvalMacro], '2 + 2', 4);
test([evalMacro, safeEvalMacro], '2 * 3', 6);
```

We encourage you to use macros instead of building your own test generators ([here is an example](https://github.com/avajs/ava-codemods/blob/47073b5b58aa6f3fb24f98757be5d3f56218d160/test/ok-to-truthy.js#L7-L9) of code that should be replaced with a macro). Macros are designed to perform static analysis of your code, which can lead to better performance, IDE integration, and linter rules.
