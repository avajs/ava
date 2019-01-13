# Execution Context (`t` argument)

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/02-execution-context.md)

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

## `t.plan(count)`

Plan how many assertion there are in the test. The test will fail if the actual assertion count doesn't match the number of planned assertions. See [assertion planning](./03-assertions.md#assertion-planning).

## `t.end()`

End the test. Only works with `test.cb()`.

## `t.log(...values)`

Log values contextually alongside the test result instead of immediately printing them to `stdout`. Behaves somewhat like `console.log`, but without support for placeholder tokens.

## `t.timeout(ms)`

Set a timeout for the test, in milliseconds. The test will fail if this timeout is exceeded. The timeout is reset each time an assertion is made.
