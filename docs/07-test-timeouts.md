# Test timeouts

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/07-test-timeouts.md)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/avajs/ava/tree/main/examples/timeouts?file=test.js&terminal=test&view=editor)

Timeouts in AVA behave differently than in other test frameworks. AVA resets a timer after each test, forcing tests to quit if no new test results were received within the specified timeout. This can be used to handle stalled tests.

The default timeout is 10 seconds.

You can configure timeouts using the `--timeout` [command line option](./05-command-line.md), or in the [configuration](./06-configuration.md). They can be set in a human-readable way:

```console
npx ava --timeout=10s # 10 seconds
npx ava --timeout=2m # 2 minutes
npx ava --timeout=100 # 100 milliseconds
```

### `t.timeout(ms, message?)`

Timeouts can also be set individually for each test. These timeouts are reset each time an assertion is made. The test fails if it takes more than `ms` for an assertion to be made or the test to complete.

```js
test('foo', t => {
	t.timeout(100); // 100 milliseconds
	// Write your assertions here
});
```

An optional message string can be provided. This can be useful if your test depends on some other setup that may not have been completed:

```js
test('foo', t => {
	t.timeout(100, 'make sure database has started'); // 100 milliseconds
	// Write your assertions here
});
```
