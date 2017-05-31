# Setup Functions vs. beforeEach Functions

In some cases, using plain setup functions is preferred to using `beforeEach` for your tests. Since the `beforeEach` function is called for every test, using independent functions allows for easier modifications between test scenarios.

## Complex test setup

In this example, we have both a `beforeEach` function, and then more modifications within each test.

```js
test.beforeEach(t => {
	setupConditionA();
	setupConditionB();
	setupConditionC();
});

test('first scenario', t => {
	tweakSomething();
	const someCondition = t.context.thingUnderTest();
	t.true(someCondition);
});

test('second scenario', t => {
	tweakSomethingElse();
	const someOtherCondition = t.context.thingUnderTest();
	t.true(someOtherCondition);
});
```

If too many variables are changing between test scenarios, consider omitting the `beforeEach` function and performing setup steps within the tests themselves.

```js
test('first scenario', t => {
	setupConditionA();
	setupConditionB({/* options */});
	setupConditionC();
	const someCondition = thingUnderTest();
	t.true(someCondition);
});

// In this test, setupConditionB() is never called.
test('second scenario', t => {
	setupConditionA();
	setupConditionC();
	const someOtherCondition = thingUnderTest();
	t.true(someOtherCondition);
});
```

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

test('authenticating with valid credentials', async t => {
  t.context.credentials.password = 'bad_password';
  const isValid = t.context.authenticator.authenticate(t.context.credentials);
  t.false(await isValid);
});
```

The same tests, now using setup functions, would look like the following.

```js
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

test('authenticating with valid credentials', async t => {
  const {authenticator, credentials} = setup({password: 'bad_password'});
  const isValid = authenticator.authenticate(credentials);
  t.false(await isValid);
});

function setup(opts) {
  opts = opts || {};
  return {
    authenticator: new Authenticator(),
    credentials: new Credentials(opts.username || 'admin', opts.password || 's3cr3t')
  };
}
```

## Using both beforeEach and setup functions

Both `beforeEach` and plain setup functions can be used together.

```js
test.beforeEach(t => {
	t.context = setupAllTests();
});

test('first scenario', t => {
	firstSetup();
	const someCondition = thingUnderTest();
	t.true(someCondition);
});
```

## Readability advantages

Stylistically, some prefer the readability of plain functions, at the cost of repetitiveness. It is clearer exactly what each test is doing.
