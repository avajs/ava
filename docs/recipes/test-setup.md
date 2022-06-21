# Test setup

Translations: [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/test-setup.md)

Tests can be set up using the `beforeEach()` hook. Often though you could use a plain setup function instead. This recipe helps you decide what's best for your use case.

# The `beforeEach()` hook versus setup functions

The `beforeEach()` hook has some downsides. For example, you cannot turn it off for specific tests, nor can you apply it to specific tests. As an alternative, you can use simple functions. This allows you to use multiple setup functions for different setup requirements and call different parts of setup from different tests. You can even have setup functions with parameters so tests can customize their own setup.

Let's say you have a function that interacts with the file system. Perhaps you run a few tests using `mock-fs`, and then a few that use the real file system and a temporary directory. Or you have a setup function that you run with valid data for some tests and invalid data for other tests, all within the same test file.

You could do all these things using plain setup functions, but there are tradeoffs:

|`beforeEach()`| Setup functions
|---|---
| ⛔️ &nbsp; used for all tests| ✅ &nbsp; can change or skip depending on test
| ⛔️ &nbsp; more overhead for beginners, "some magic"| ✅ &nbsp; easier for beginners, "no magic"
| ✅ &nbsp; built-in support for observables| ⛔️ &nbsp; must use promises for asynchronous behavior
| ✅ &nbsp; failure has friendly output| ⛔️ &nbsp; errors are attributed to the test
| ✅ &nbsp; corresponding `afterEach` and `afterEach.always` for cleanup| ⛔️ &nbsp; cannot easily clean up

## Complex test setup

In this example, we have both a `beforeEach()` hook, and then more modifications within each test.

```js
test.beforeEach(t => {
	setupConditionA(t);
	setupConditionB(t);
	setupConditionC(t);
});

test('first scenario', t => {
	tweakSomething(t);
	const someCondition = t.context.thingUnderTest();
	t.true(someCondition);
});

test('second scenario', t => {
	tweakSomethingElse(t);
	const someOtherCondition = t.context.thingUnderTest();
	t.true(someOtherCondition);
});
```

If too many variables need changing for each test, consider omitting the `beforeEach()` hook and performing setup steps within the tests themselves.

```js
test('first scenario', t => {
	setupConditionA(t);
	setupConditionB(t, {/* options */});
	setupConditionC(t);
	const someCondition = t.context.thingUnderTest();
	t.true(someCondition);
});

// In this test, setupConditionB() is never called.
test('second scenario', t => {
	setupConditionA(t);
	setupConditionC(t);
	const someOtherCondition = t.context.thingUnderTest();
	t.true(someOtherCondition);
});
```

You can use [`t.teardown()`](../02-execution-context.md#tteardownfn) to register a teardown function which will run after the test has finished (regardless of whether it's passed or failed).

## A practical example

```js
test.beforeEach(t => {
	t.context = {
		authenticator: new Authenticator(),
		credentials: new Credentials('admin', 's3cr3t')
	};
});

test('authenticating with valid credentials', async t => {
	const isValid = t.context.authenticator.authenticate(t.context.credentials);
	t.true(await isValid);
});

test('authenticating with an invalid username', async t => {
	t.context.credentials.username = 'bad_username';
	const isValid = t.context.authenticator.authenticate(t.context.credentials);
	t.false(await isValid);
});

test('authenticating with an invalid password', async t => {
	t.context.credentials.password = 'bad_password';
	const isValid = t.context.authenticator.authenticate(t.context.credentials);
	t.false(await isValid);
});
```

The same tests, now using setup functions, would look like the following.

```js
function setup({username = 'admin', password = 's3cr3t'} = {}) {
	return {
		authenticator: new Authenticator(),
		credentials: new Credentials(username, password)
	};
}

test('authenticating with valid credentials', async t => {
	const {authenticator, credentials} = setup();
	const isValid = authenticator.authenticate(credentials);
	t.true(await isValid);
});

test('authenticating with an invalid username', async t => {
	const {authenticator, credentials} = setup({username: 'bad_username'});
	const isValid = authenticator.authenticate(credentials);
	t.false(await isValid);
});

test('authenticating with an invalid password', async t => {
	const {authenticator, credentials} = setup({password: 'bad_password'});
	const isValid = authenticator.authenticate(credentials);
	t.false(await isValid);
});
```

## Combining hooks and setup functions

Of course `beforeEach()` and plain setup functions can be used together:

```js
test.beforeEach(t => {
	t.context = setupAllTests();
});

test('first scenario', t => {
	firstSetup(t);
	const someCondition = t.context.thingUnderTest();
	t.true(someCondition);
});
```
