# Flow

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/flow.md)

AVA comes bundled with a Flow definition file. This allows developers to leverage Flow for writing tests.

This guide assumes you've already set up Flow for your project. Note that AVA's definition as been tested with version 0.73.0.

We recommend you use AVA's built-in Babel pipeline to strip Flow type annotations and declarations. AVA automatically applies your project's Babel configuration, so everything may just work without changes. Alternatively install [`@babel/plugin-transform-flow-strip-types`](https://www.npmjs.com/package/@babel/plugin-transform-flow-strip-types) and customize AVA's configuration in the `package.json` file (or the `ava.config.js` file) as follows:

```json
{
	"ava": {
		"babel": {
			"testOptions": {
				"plugins": ["@babel/plugin-transform-flow-strip-types"]
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

## Typing [`t.context`](https://github.com/avajs/ava#test-context)

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

## Using `t.throws()` and `t.notThrows()`

The `t.throws()` and `t.noThrows()` assertions can be called with a function that returns an observable or a promise. You may have to explicitly type functions:

```ts
import test from 'ava';

test('just throws', async t => {
	const expected = new Error();
	const err = t.throws((): void => { throw expected; });
	t.is(err, expected);

	const err2 = await t.throws((): Promise<*> => Promise.reject(expected));
	t.is(err2, expected);
});
```
