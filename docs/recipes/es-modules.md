# Using ES modules in AVA

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/es-modules.md)

As of Node.js 12.17, [ECMAScript Modules](https://nodejs.org/docs/latest/api/esm.html#esm_introduction) are natively supported in Node.js itself. AVA 3.3 supports ESM test files, however support is incomplete. The [ESM support project](https://github.com/orgs/avajs/projects/2) tracks our progress.

If you use TypeScript with `ts-node` please [see our Typescript recipe for setup instructions](./typescript.md).

## Using the `esm` package

If you're using Node.js 10 and AVA 3 and you want to use the ESM syntax, without relying on Node.js' implementation, your best bet is to use the [`esm`](https://github.com/standard-things/esm) package. Make sure to use the `.js` extension and *do not* set `"type": "module"` in `package.json`.

*Note: The `esm` package is no longer supported in AVA 4.*

Here's how you get it working with AVA.

First, install `esm`:

```
$ npm install esm
```

Configure it in your `package.json` or `ava.config.*` file, and add it to AVA's `"require"` option as well. Make sure to add it as the first item.

**`package.json`:**

```json
{
	"ava": {
		"require": [
			"esm"
		]
	}
}
```

You can now use native ES modules with AVA:

```js
// sum.js
export default function sum(a, b) {
	return a + b;
};
```

```js
// test.js
import test from 'ava';
import sum from './sum';

test('2 + 2 = 4', t => {
	t.is(sum(2, 2), 4);
});
```
