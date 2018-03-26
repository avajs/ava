# Using Context in Tests

Translations: TBD

`t.context` allows you to set up the test environment for the current file / test context.

## Intro

Set your `t.context` value(s) within the `test.beforeEach` block:

```js
test.beforeEach(t => {
	t.context.data = generateUniqueData();
	t.context.foo = 'bar';
});
```

You can then use the `t.context` object in your tests:

```js
test('context is bar', t => {
	t.is(t.context.foo, 'bar'); // => Passes
});
```


## Context Flow

![](../../media/context-flow.png)

###### Blue arrows show how `t.context` is persisted across test flows

Context created in `.before()` hooks is [cloned](https://www.npmjs.com/package/lodash.clone) before it is passed to `.beforeEach()` hooks and / or tests. The `.after()` and `.after.always()` hooks receive the original context value.

For `.beforeEach()`, `.afterEach()`, and `.afterEach.always()` hooks, the context is *not* shared between different tests, allowing you to set up data such that it will not leak to other tests.


## Examples of Context Flow

### 1. Original context created in `test.before()` is always available in `test.after()`

```js
test.before(t => {
	t.context.foo = 'foo'
})

test.beforeEach(t => {
	t.context.beforeEachFoo = 'bar';
})

test('something', t => {
	t.context.foo = bar; // Attempt to change `foo` in `test.before`

	t.context.testFoo = 'bar';
})

test.afterEach(t => {
	t.context.afterEachFoo = 'bar';
})

// Context changes in `test.beforeEach`, `test.afterEach`, and `test` does not affect context in `test.after()`
test.after(t => {
	console.log(t.context.foo); // foo (Change in test is not reflected)
	console.log(t.context.beforeEachFoo); // undefined
	console.log(t.context.afterEachFoo); // undefined
})
```


### 2. Context in `test.beforeEach()` and `test.afterEach()` is not available across different tests

`sometest.js`:

```js
test.beforeEach(t => {
	t.context.foo = 'pony';
})

test('bear test', t => {
	t.context.foo = 'BEAR';

	// …
})

test('other test', t => {
	// Test that doesn't change `t.context.foo`
})

test('other test 2', t => {
	// Test that doesn't change `t.context.foo`
})

test.afterEach(t => {
	console.log('Context `foo` is', t.context.foo);
})
```

`console output`:

```sh
$ ava
Context `foo` is BEAR # `BEAR` assignment is carried over to afterEach hook of only that test
Context `foo` is pony # Not affected by the 'BEAR' assignment
Context `foo` is pony # Also not affected

# Serial or non-serial doesn't change this
$ ava --serial
Context `foo` is BEAR
Context `foo` is pony
Context `foo` is pony
```


Have fun! 🦄
