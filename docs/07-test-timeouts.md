# Test timeouts

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/07-test-timeouts.md)

Timeouts in AVA behave differently than in other test frameworks. AVA resets a timer after each test, forcing tests to quit if no new test results were received within the specified timeout. This can be used to handle stalled tests.

The default timeout is 10 seconds.

You can configure timeouts using the `--timeout` [command line option](./05-command-line.md), or in the [configuration](./06-configuration.md). They can be set in a human-readable way:

```console
npx ava --timeout=10s # 10 seconds
npx ava --timeout=2m # 2 minutes
npx ava --timeout=100 # 100 milliseconds
```

### `.timeout(ms, message?)`

Timeouts can also be set individiually for each test. A test will fail if the test is not completed after `ms`. These timeouts are reset each time an assertion is made.

```js
test('foo', t => {
	t.timeout(100); // 100 milliseconds
	// Write your assertions here
});
```

An optional message string can also be provided to provide actionable, test specific feedback.

```js
test('foo', t => {
	t.timeout(100, 'Test timed out. Review the ./foo implementation and ensure the retries/timeout configurations are set'); // 100 milliseconds
	// Write your assertions here
});
```
