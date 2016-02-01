# When to use `t.plan()`

One major difference between AVA and [`tap`](https://github.com/tapjs/node-tap)/[`tape`](https://github.com/substack/tape) is the behavior of `t.plan()`. In AVA, `t.plan()` is only used to assert that the expected number of assertions are called; it does not auto-end the test.

## Poor uses of `t.plan()`

Many users transitioning from `tap`/`tape` are accustomed to using `t.plan()` prolifically in every test. However, in AVA, we don't consider that to be a "best practice". Instead, we believe `t.plan()` should only be used in situations where it provides some value.

### Sync tests with no branching

`t.plan()` is unnecessary in most sync tests.

```js
test(t => {
	// BAD: there is no branching here - t.plan() is pointless
	t.plan(2);

	t.is(1 + 1, 2);
	t.is(2 + 2, 4);
});
```

`t.plan()` does not provide any value here, and creates an extra chore if you ever decide to add or remove assertions.

### Promises that are expected to resolve

```js
test(t => {
	t.plan(1);

	return somePromise().then(result => {
		t.is(result, 'foo');
	});
});
```

At a glance, this tests appears to make good use of `t.plan()` since an async promise handler is involved. However there are several problems with the test:

1. `t.plan()` is presumably used here to protect against the possibility that `somePromise()` might be rejected; But returning a rejected promise would fail the test anyways.

2. It would be better to take advantage of `async`/`await`:

```js
test(async t => {
	t.is(await somePromise(), 'foo');
});
```

## Good uses of `t.plan()`

`t.plan()` has many acceptable uses.

### Promises with a `.catch()` block

```js
test(t => {
	t.plan(2);

	return shouldRejectWithFoo().catch(reason => {
		t.is(reason.message, 'Hello') // Prefer t.throws() if all you care about is the message
		t.is(reason.foo, 'bar');
	});
});
```

Here, `t.plan()` is used to ensure the code inside the `catch` block happens. In most cases, you should prefer the `t.throws()` assertion, but this is an acceptable use since `t.throws()` only allows you to assert against the error's `message` property.

### Ensuring a catch statement happens

```js
test(t => {
	t.plan(2);

	try {
		shouldThrow();
	} catch (err) {
		t.is(err.message, 'Hello') // Prefer t.throws() if all you care about is the message
		t.is(err.foo, 'bar');
	}
});
```

As stated in the `try`/`catch` example above, using the `t.throws()` assertion is usually a better choice, but it only lets you assert against the error's `message` property.

### Ensuring multiple callbacks are actually called

```js
test.cb(t => {
	t.plan(2);

	const callbackA = () => {
		t.pass();
		t.end();
	};

	const callbackB = () => t.pass();

	bThenA(callbackA, callbackB);
});
```

The above ensures `callbackB` is called first (and only once), followed by `callbackA`. Any other combination would not satisfy the plan.

### Tests with branching statements

In most cases, it's a bad idea to use any complex branching inside your tests. A notable exception is for tests that are auto-generated (perhaps from a JSON document). Below `t.plan()` is used to ensure the correctness of the JSON input:

```js
const testData = require('./fixtures/test-definitions.json');

testData.forEach(testDefinition => {
	test(t => {
		const result = functionUnderTest(testDefinition.input);

		// testDefinition should have an expectation for `foo` or `bar` but not both
		t.plan(1);

		if (testDefinition.foo) {
			t.is(result.foo, testDefinition.foo);
		}

		if (testDefinition.bar) {
			t.is(result.bar, testDefinition.foo);
		}
	});
});
```

## Conclusion

`t.plan()` has plenty of valid uses, but it should not be used indiscriminately. A good rule of thumb is to use it any time your *test* does not have straightforward, easily reasoned about, code flow. Tests with assertions inside callbacks, `if`/`then` statements, `for`/`while` loops, and (in some cases) `try`/`catch` blocks, are all good candidates for `t.plan()`.
