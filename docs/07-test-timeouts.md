# Test timeouts

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/07-test-timeouts.md)

Timeouts in AVA behave differently than in other test frameworks. AVA resets a timer after each test, forcing tests to quit if no new test results were received within the specified timeout. This can be used to handle stalled tests.

You can configure timeouts using the `--timeout` [command line option](./05-command-line.md), or in the [configuration](./06-configuration.md).

You can set timeouts in a human-readable way:

```console
npx ava --timeout=10s # 10 seconds
npx ava --timeout=2m # 2 minutes
npx ava --timeout=100 # 100 milliseconds
```

Timeouts can also be set individually for each test. These timeouts are reset each time an assertion is made.

```js
test('foo', t => {
	t.timeout(100); // 100 milliseconds
	// Write your assertions here
});
```
