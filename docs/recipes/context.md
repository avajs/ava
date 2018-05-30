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

#### `test.before()`

A **shallow** [clone](https://www.npmjs.com/package/lodash.clone) of `t.context` created in `.before()` hooks is passed to the `.beforeEach()` hooks of each test, as well as `test.after()`. If you set an **`object`** as a value in `t.context` and modify these values during your tests, you *will* see the *modified* values in subsequent tests. (If it is not an `object`, you will not.)

```js
test.before(t => {
    t.context.foo = { 'animal': 'pony' };
    t.context.bar = 'unicorn';
})

test('gimme a Bear', t => {
    t.context.foo.animal2 = 'BEAR';
    t.context.bar = 'BEAR';
    // ...
})

test('What happened to pony?', t => {
    t.is(t.context.foo, { 'animal': 'pony' });
}) // Fails, `t.context.foo` now contains 'animal' and 'animal2'

test('What about unicorn?', t => {
    t.is(t.context.bar, 'unicorn');
}) // Passes, `t.context.bar` is still 'unicorn'.
```

#### `test.beforeEach()`

Unlike `test.before()`, in every `.beforeEach()` process, `t.context` objects you set will be reset in the next test flow. (Even if you modify these values later in your tests, you will *not* see the modified values in subsequent tests.)

```js
test.beforeEach(t => {
    t.context.foo = 'pony';
    t.context.bar = { 'animal': 'unicorn' }
})

test('change it to Bear', t => {
    t.context.foo = 'BEAR';
    t.context.bar.animal2 = 'bear';
    // ...
})

test('is Pony still there?', t => {
    t.is(t.context.foo, 'pony');
}) // Passes, `t.context.foo` is assigned to 'pony' before this test begins

test('what about Unicorn?', t => {
    t.is(t.context.foo, { 'animal': 'unicorn' });
}) // Passes, `t.context.bar` 'animal2' assignment does not persist across tests as it is reset to simply `{ 'animal': 'unicorn' }` before each test.
```

#### `test.afterEach()`

Each `.afterEach()` hook receives `t.context` from its respective test. This contains the `t.context` values originally set in `test.before()` that could have been altered by previous tests (see the above `test.before()` section). It also contains the `t.context` values set in `test.beforeEach()`, including their modifications in the most recent test. The `t.context` at the end of `.afterEach()` hooks will be passed to their respective `.afterEach.always()` hooks.

#### `test.afterEach.always()`

Each `.afterEach.always()` hook receives `t.context` from its last respective `.afterEach()` hook. `t.context` objects will cease to persist and will not carry on to subsequent tests unless they were first assigned in a `.before()` hook.

#### `test.after()`

The `.after()` hooks receive `t.context` assignments from `.before()` hooks. If (and only if) those assignments were **`objects`**, _and_ they were modified in tests earlier, you will see the modifications here. You will **not** see `t.context` assignments that were not first set in `.before()` hooks.

Context at the end of `.after()` hooks are passed to `.after.always()` hooks.

```js
test.before(t => {
	t.context.fooObject = { 'animal': 'bar' };
    
    t.context.foo = 'bar';
    
})

test.beforeEach(t => {
    t.context.something = 'else';
})

test('Makes it a pony!', t => {
    t.context.fooObject.animal = 'pony';
    
	t.context.foo = 'pony';
    
    t.context.bar = 'unicorn';
    // ...
})

test.after(t => {
    t.is(t.context.fooObject, { 'animal': 'pony' }); // Passes
    
    t.is(t.context.foo, 'pony'); // Fails, `t.context.foo` is not an `object` and thus its changes were not persisted. Its value is still 'bar'.
    
    t.is(t.context.bar, 'unicorn'); // Fails, `t.context.bar` is undefined
    
    t.is(t.context.something, 'else'); // Fails, `t.context.something` is undefined
})
```

#### `test.after.always()`

The `.after.always()` hooks receive `t.context` from the `.after()` hooks.






Have fun! 🦄
