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

When used in `test.afterEach()` or `test.afterEach.always()` hooks this tells you whether the test has passed. When used in a test itself (including teardown functions) this remains `true` until an assertion fails, the test has ended with an error, or a teardown function caused an error. This value has no meaning in other hooks.

## `t.end()`

End the test. Only works with `test.cb()`.

## `t.log(...values)`

Log values contextually alongside the test result instead of immediately printing them to `stdout`. Behaves somewhat like `console.log`, but without support for placeholder tokens.

## `t.plan(count)`

Plan how many assertions there are in the test. The test will fail if the actual assertion count doesn't match the number of planned assertions. See [assertion planning](./03-assertions.md#assertion-planning).

## `t.teardown(fn)`

Registers the `fn` function to be run after the test has finished. You can register multiple functions. In AVA 3 the functions are called in order, but in AVA 4 they'll run in _reverse_ order.<sup>†</sup>. You can use asynchronous functions: only one will run at a time.

You cannot perform assertions using the `t` object or register additional functions from inside `fn`.

You cannot use `t.teardown()` in hooks either.

<sup>†</sup> You can opt in to this behavior in AVA 3 by enabling the `reverseTeardowns` experiment.

**`package.json`**:

```json
{
	"ava": {
		"nonSemVerExperiments": {
			"reverseTeardowns": true
		}
	}
}
```

**`ava.config.js`**:

```js
export default {
	nonSemVerExperiments: {
		reverseTeardowns: true
	}
}
```

## `t.timeout(ms)`

Set a timeout for the test, in milliseconds. The test will fail if this timeout is exceeded. The timeout is reset each time an assertion is made.
