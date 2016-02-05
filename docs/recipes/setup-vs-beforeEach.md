# Setup Functions vs. beforeEach Functions

It can be stylistically beneficial to have individual setup functions called from within the test scenario, instead of a single `beforeEach` function.

## Complex test setup

In this example, we have both test setup and modifications within each test.

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

We can make this more readable, at the cost of repetitiveness, by omitting the `beforeEach` function and performing our setup steps within the tests themselves.

```js
test('first scenario', t => {
	setupConditionA();
	setupConditionB(options);
	setupConditionC();
	const someCondition = thingUnderTest();
	t.true(someCondition);
});

test('second scenario', t => {
	setupConditionA();
	setupConditionB();
	setupConditionC(options);
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

## Advantages of using setup functions

1. Setup functions allow for easier modifications between test runs.
2. The test can be easier to read. Since the entire test is configured within the test, your eyes do not need to jump between `beforeEach` and `test` functions.
3. Since the `test` function is isolated there is no need to worry about test context (`t.context`).

## Disadvantages of using setup functions

1. Tests can be more repetitive. Your setup function(s) need to be called for each test.
