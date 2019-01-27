# Flow

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/flow.md)

AVA comes bundled with a Flow definition file. This allows developers to leverage Flow for writing tests.

This guide assumes you've already set up Flow for your project. Note that AVA's definition as been tested with version 0.91.0.

We recommend you use AVA's built-in Babel pipeline to strip Flow type annotations and declarations. AVA automatically applies your project's Babel configuration, so everything may just work without changes. Alternatively install [`@babel/plugin-transform-flow-strip-types`](https://www.npmjs.com/package/@babel/plugin-transform-flow-strip-types) and customize AVA's configuration in the `package.json` file (or the `ava.config.js` file) as follows.

**`package.json`:**

```json
{
	"ava": {
		"babel": {
			"testOptions": {
				"plugins": [
					"@babel/plugin-transform-flow-strip-types"
				]
			}
		}
	}
}
```

See our [Babel documentation](babel.md) for more details.

## Writing tests

Create a `test.js` file.

```js
// @flow
import test from 'ava';

const fn = async () => Promise.resolve('foo');

test(async (t) => {
	t.is(await fn(), 'foo');
});
```

## Typing [`t.context`](../01-writing-tests.md#test-context)

By default, the type of `t.context` will be the empty object (`{}`). AVA exposes an interface `TestInterface<Context>` which you can use to apply your own type to `t.context`. This can help you catch errors at compile-time:

```js
// @flow
import anyTest from 'ava';
import type {TestInterface} from 'ava';

const test: TestInterface<{foo: string}> = (anyTest: any);

test.beforeEach(t => {
	t.context = {foo: 'bar'};
});

test.beforeEach(t => {
	t.context.foo = 123; // error:  Type '123' is not assignable to type 'string'
});

test.serial.cb.failing('very long chains are properly typed', t => {
	t.context.fooo = 'a value'; // error: Property 'fooo' does not exist on type ''
});

test('an actual test', t => {
	t.deepEqual(t.context.foo.map(c => c), ['b', 'a', 'r']); // error: Property 'map' does not exist on type 'string'
});
```

Note that, despite the type cast above, when executing `t.context` is an empty object unless it's assigned.

## Typing `throws` assertions

The `t.throws()` and `t.throwsAsync()` assertions are typed to always return an Error. You can customize the error class using generics:

```js
// @flow
import test from 'ava';

class CustomError extends Error {
	parent: Error;

	constructor(parent) {
		super(parent.message);
		this.parent = parent;
	}
}

function myFunc() {
	throw new CustomError(new TypeError('🙈'));
};

test('throws', t => {
	const err = t.throws<CustomError>(myFunc);
	t.is(err.parent.name, 'TypeError');
});

test('throwsAsync', async t => {
	const err = await t.throwsAsync<CustomError>(async () => myFunc());
	t.is(err.parent.name, 'TypeError');
});
```

Note that, despite the typing, the assertion returns `undefined` if it fails. Typing the assertions as returning `Error | undefined` didn't seem like the pragmatic choice.
