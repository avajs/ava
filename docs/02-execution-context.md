# Execution Context (`t` argument)

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/02-execution-context.md)

Each test or hook is called with an execution context. By convention it's named `t`.

```js
import test from 'ava';

test('my passing test', t => {
	t.pass();
});
```

Each test or hook receives a different object. It contains the [assertions](./03-assertions.md) as well as the methods and properties listed below.

## `t.title`

The test title.

## `t.context`

Contains shared state from hooks.

## `t.passed`

When used in `test.afterEach()` or `test.afterEach.always()` hooks this tells you whether the test has passed. When used in a test itself (including teardown functions) this remains `true` until an assertion fails, the test has ended with an error, or a teardown function caused an error. This value has no meaning in other hooks.

## `t.log(...values)`

Log values contextually alongside the test result instead of immediately printing them to `stdout`. Behaves somewhat like `console.log`, but without support for placeholder tokens.

## `t.plan(count)`

Plan how many assertions there are in the test. The test will fail if the actual assertion count doesn't match the number of planned assertions. See [assertion planning](./03-assertions.md#assertion-planning).

## `t.teardown(fn)`

Registers cleanup for a test or setup hook. Pass a function, or a disposable object implementing `Symbol.asyncDispose` or `Symbol.dispose`. Async disposal is preferred when both methods exist. Disposal methods are called with the object as `this`, and asynchronous cleanup is awaited.

The lifetime depends on where you register the teardown:

* In a test (including a `t.try()` attempt), it runs when that test finishes, **before** `afterEach` hooks. This ordering is unchanged.
* In a `beforeEach` hook, it runs after that test's `afterEach` and `afterEach.always` postconditions.
* In a `before` hook, it runs after the file's `after` and `after.always` postconditions.

Within each lifetime, teardowns run serially in reverse registration order. Register cleanup as soon as a resource is acquired: already registered teardowns run even if a later setup step, test, or postcondition fails. Cleanup continues if a teardown throws or rejects. Test teardown failures fail the test; setup teardown failures are reported as hook failures.

You cannot perform assertions using the `t` object or register additional teardowns from inside cleanup. `t.teardown()` is not supported in `after` or `afterEach` hooks, including their `.always` variants. Returning a disposable from a hook does not register it for cleanup.

```js
test.beforeEach(async t => {
	const resource = await createResource();
	t.teardown(() => resource.close());
	t.context.resource = resource;
});

test.afterEach(t => {
	// The setup resource is still available for postconditions.
	t.true(t.context.resource.isHealthy());
});
```

For resources that implement the disposal protocol, use `t.teardown(resource)` instead of a callback.

Crashes and forced termination can still prevent cleanup. Teardowns cannot guarantee cleanup after uncaught exceptions, unhandled rejections, timeouts, or worker termination (including fail-fast or interruption).

## `t.timeout(ms)`

Set a timeout for the test, in milliseconds. The test will fail if this timeout is exceeded. The timeout is reset each time an assertion is made.

Use `t.timeout.clear()` to clear the timeout and restore the default behavior.
