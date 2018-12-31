# Assertions

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/03-assertions.md)

Assertions are mixed into the [execution object](./02-execution-context.md) provided to each test implementation:

```js
test('unicorns are truthy', t => {
	t.truthy('unicorn'); // Assertion
});
```

Assertions are bound to their test so you can assign them to a variable or pass them around:

```js
test('unicorns are truthy', t => {
	const truthy = t.truthy;
	truthy('unicorn');
});
```

If multiple assertion failures are encountered within a single test, AVA will only display the *first* one.

## Assertion planning

Assertion plans ensure tests only pass when a specific number of assertions have been executed. They'll help you catch cases where tests exit too early. They'll also cause tests to fail if too many assertions are executed, which can be useful if you have assertions inside callbacks or loops.

If you do not specify an assertion plan, your test will still fail if no assertions are executed. Set the `failWithoutAssertions` option to `false` in AVA's [`package.json` configuration](./06-configuration.md) to disable this behavior.

Note that, unlike [`tap`](https://www.npmjs.com/package/tap) and [`tape`](https://www.npmjs.com/package/tape), AVA does *not* automatically end a test when the planned assertion count is reached.

These examples will result in a passed test:

```js
test('resolves with 3', t => {
	t.plan(1);

	return Promise.resolve(3).then(n => {
		t.is(n, 3);
	});
});

test.cb('invokes callback', t => {
	t.plan(1);

	someAsyncFunction(() => {
		t.pass();
		t.end();
	});
});
```

These won't:

```js
test('loops twice', t => {
	t.plan(2);

	for (let i = 0; i < 3; i++) {
		t.true(i < 3);
	}
}); // Fails, 3 assertions are executed which is too many

test('invokes callback synchronously', t => {
	t.plan(1);

	someAsyncFunction(() => {
		t.pass();
	});
}); // Fails, the test ends synchronously before the assertion is executed
```

## Skipping assertions

Any assertion can be skipped using the `skip` modifier. Skipped assertions are still counted, so there is no need to change your planned assertion count.

```js
test('skip assertion', t => {
	t.plan(2);
	t.is.skip(foo(), 5); // No need to change your plan count when skipping
	t.is(1, 1);
});
```

## Enhanced assertion messages

AVA comes with [`power-assert`](https://github.com/power-assert-js/power-assert) built-in, giving you more descriptive assertion messages. It reads your test and tries to infer more information from the code.

Let's take this example, using Node's standard [`assert` library](https://nodejs.org/api/assert.html):

```js
const a = /foo/;
const b = 'bar';
const c = 'baz';
require('assert').ok(a.test(b) || b === c);
```

If you paste that into a Node REPL it'll return:

```
AssertionError: false == true
```

In AVA however, this test:

```js
test('enhanced assertions', t => {
	const a = /foo/;
	const b = 'bar';
	const c = 'baz';
	t.true(a.test(b) || b === c);
});
```

Will output:

```
t.true(a.test(b) || b === c)
       |      |     |     |
       |      "bar" "bar" "baz"
       false
```

## Custom assertions

You can use any assertion library instead of or in addition to the built-in one, provided it throws exceptions when the assertion fails.

This won't give you as nice an experience as you'd get with the [built-in assertions](#built-in-assertions) though, and you won't be able to use the [assertion planning](#assertion-planning) ([see #25](https://github.com/avajs/ava/issues/25)).

You'll have to configure AVA to not fail tests if no assertions are executed, because AVA can't tell if custom assertions pass. Set the `failWithoutAssertions` option to `false` in AVA's [`package.json` configuration](./06-configuration.md).

```js
import assert from 'assert';

test('custom assertion', t => {
	assert(true);
});
```

## Built-in assertions

### `.pass([message])`

Passing assertion.

### `.fail([message])`

Failing assertion.

### `.truthy(value, [message])`

Assert that `value` is truthy.

### `.falsy(value, [message])`

Assert that `value` is falsy.

### `.true(value, [message])`

Assert that `value` is `true`.

### `.false(value, [message])`

Assert that `value` is `false`.

### `.is(value, expected, [message])`

Assert that `value` is the same as `expected`. This is based on [`Object.is()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is).

### `.not(value, expected, [message])`

Assert that `value` is not the same as `expected`. This is based on [`Object.is()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is).

### `.deepEqual(value, expected, [message])`

Assert that `value` is deeply equal to `expected`. See [Concordance](https://github.com/concordancejs/concordance) for details. Works with [React elements and `react-test-renderer`](https://github.com/concordancejs/react).

### `.notDeepEqual(value, expected, [message])`

Assert that `value` is not deeply equal to `expected`. The inverse of `.deepEqual()`.

### `.throws(fn, [expected, [message]])`

Assert that an error is thrown. `fn` must be a function which should throw. The thrown value *must* be an error. It is returned so you can run more assertions against it.

`expected` can be a constructor, in which case the thrown error must be an instance of the constructor. It can be a string, which is compared against the thrown error's message, or a regular expression which is matched against this message. You can also specify a matcher object with one or more of the following properties:

* `instanceOf`: a constructor, the thrown error must be an instance of
* `is`: the thrown error must be strictly equal to `expected.is`
* `message`: either a string, which is compared against the thrown error's message, or a regular expression, which is matched against this message
* `name`: the expected `.name` value of the thrown error
* `code`: the expected `.code` value of the thrown error

`expected` does not need to be specified. If you don't need it but do want to set an assertion message you have to specify `null`.

Example:

```js
const fn = () => {
	throw new TypeError('🦄');
};

test('throws', t => {
	const error = t.throws(() => {
		fn();
	}, TypeError);

	t.is(error.message, '🦄');
});
```

### `.throwsAsync(thrower, [expected, [message]])`

Assert that an error is thrown. `thrower` can be an async function which should throw, or a promise that should reject. This assertion must be awaited.

The thrown value *must* be an error. It is returned so you can run more assertions against it.

`expected` can be a constructor, in which case the thrown error must be an instance of the constructor. It can be a string, which is compared against the thrown error's message, or a regular expression which is matched against this message. You can also specify a matcher object with one or more of the following properties:

* `instanceOf`: a constructor, the thrown error must be an instance of
* `is`: the thrown error must be strictly equal to `expected.is`
* `message`: either a string, which is compared against the thrown error's message, or a regular expression, which is matched against this message
* `name`: the expected `.name` value of the thrown error
* `code`: the expected `.code` value of the thrown error

`expected` does not need to be specified. If you don't need it but do want to set an assertion message you have to specify `null`.

Example:

```js
test('throws', async t => {
	await t.throwsAsync(async () => {
		throw new TypeError('🦄');
	}, {instanceOf: TypeError, message: '🦄'});
});
```

```js
const promise = Promise.reject(new TypeError('🦄'));

test('rejects', async t => {
	const error = await t.throwsAsync(promise);
	t.is(error.message, '🦄');
});
```

### `.notThrows(fn, [message])`

Assert that no error is thrown. `fn` must be a function which shouldn't throw.

### `.notThrowsAsync(nonThrower, [message])`

Assert that no error is thrown. `nonThrower` can be an async function which shouldn't throw, or a promise that should resolve.

Like the `.throwsAsync()` assertion, you must wait for the assertion to complete:

```js
test('resolves', async t => {
	await t.notThrowsAsync(promise);
});
```

### `.regex(contents, regex, [message])`

Assert that `contents` matches `regex`.

### `.notRegex(contents, regex, [message])`

Assert that `contents` does not match `regex`.

### `.snapshot(expected, [message])`
### `.snapshot(expected, [options], [message])`

Compares the `expected` value with a previously recorded snapshot. Snapshots are stored for each test, so ensure you give your tests unique titles. Alternatively pass an `options` object to select a specific snapshot, for instance `{id: 'my snapshot'}`.

Snapshot assertions cannot be skipped when snapshots are being updated.
