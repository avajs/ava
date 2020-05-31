# Execution Context (`t` argument)

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/02-execution-context.md)

Each test or hook is called with an execution context. By convention it's named `t`.

```js
const test = require('ava');

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

Whether a test has passed. This value is only accurate in the `test.afterEach()` and `test.afterEach.always()` hooks.

## `t.end()`

End the test. Only works with `test.cb()`.

## `t.log(...values)`

Log values contextually alongside the test result instead of immediately printing them to `stdout`. Behaves somewhat like `console.log`, but without support for placeholder tokens.

## `t.plan(count)`

Plan how many assertion there are in the test. The test will fail if the actual assertion count doesn't match the number of planned assertions. See [assertion planning](./03-assertions.md#assertion-planning).

## `t.teardown(fn)`

Registers the `fn` function to be run after the test has finished. You can register multiple functions and they'll run in order. You can use asynchronous functions: only one will run at a time.

You cannot perform assertions using the `t` object or register additional functions from inside `fn`.

You cannot use `t.teardown()` in hooks either.

If you would prefer that the teardown functions run in the reverse order that they were registered, you can add the following to your AVA configuration:

```json
{
	"ava": {
		"nonSemVerExperiments": {
			"reverseTeardowns": true
		}
	}
}
```

## `t.timeout(ms)`

Set a timeout for the test, in milliseconds. The test will fail if this timeout is exceeded. The timeout is reset each time an assertion is made.
