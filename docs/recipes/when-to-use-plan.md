# When to use `t.plan()`

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/when-to-use-plan.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/when-to-use-plan.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/recipes/when-to-use-plan.md), [日本語](https://github.com/avajs/ava-docs/blob/master/ja_JP/docs/recipes/when-to-use-plan.md),  [Português](https://github.com/avajs/ava-docs/blob/master/pt_BR/docs/recipes/when-to-use-plan.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/docs/recipes/when-to-use-plan.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/docs/recipes/when-to-use-plan.md)

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

### Promises with a `.catch()` block

```js
test(t => {
	t.plan(2);

	return shouldRejectWithFoo().catch(reason => {
		t.is(reason.message, 'Hello');
		t.is(reason.foo, 'bar');
	});
});
```

Here, the use of `t.plan()` seeks to ensure that the code inside the `catch` block is executed.
Instead, you should take advantage of `t.throws` and `async`/`await`, as this leads to flatter code that is easier to reason about:

```js
test(async t => {
	const reason = await t.throws(shouldRejectWithFoo());
	t.is(reason.message, 'Hello');
	t.is(reason.foo, 'bar');
});
```

### Ensuring a catch statement happens

```js
test(t => {
	t.plan(2);

	try {
		shouldThrow();
	} catch (err) {
		t.is(err.message, 'Hello');
		t.is(err.foo, 'bar');
	}
});
```

As stated in the previous example, using the `t.throws()` assertion with `async`/`await` is a better choice.

## Good uses of `t.plan()`

`t.plan()` provides value in the following cases.

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
