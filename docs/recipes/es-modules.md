# Using ES modules in AVA

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/es-modules.md)

As of Node.js 13, [ECMAScript Modules](https://nodejs.org/docs/latest/api/esm.html#esm_introduction) are natively supported in Node.js itself. AVA 3.3 supports ESM test files, however support is incomplete. The [ESM support project](https://github.com/orgs/avajs/projects/2) tracks our progress.

ESM support in Node.js is experimental, though enabled by default in Node.js 13. *You will see messages like `ExperimentalWarning: The ESM module loader is experimental` in AVA's output. These are emitted by Node.js, not AVA.*

## Enabling experimental ESM support in Node.js 12

In Node.js 12 you need to enable ESM support. You can do so via AVA by configuring `nodeArguments` in your `package.json` or `ava.config.*` file:

**`package.json`:**

```json
{
	"ava": {
		"nodeArguments": [
			"--experimental-modules"
		]
	}
}
```

Or on the command line:

```console
npx ava --node-arguments '--experimental-modules' test.mjs
```

## Using the `esm` package

If you want to use the ESM syntax, without relying on Node.js' implementation, your best bet is to use the [`esm`](https://github.com/standard-things/esm) package. Make sure to use the `.js` extension and *do not* set `"type": "module"` in `package.json`.

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
const test = require('ava');
const sum = require('./sum');

test('2 + 2 = 4', t => {
	t.is(sum(2, 2), 4);
});
```
