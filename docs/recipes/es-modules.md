# Using ES modules in AVA

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/es-modules.md)

As of Node.js 13, [ECMAScript modules](https://nodejs.org/docs/latest/api/esm.html#esm_introduction) are natively supported in Node.js itself. AVA does not quite support them *yet*, but we're close.

For the time being, AVA *does* select test files with the `.mjs` extension, however it refuses to load them. Similarly the `package.json` `"type": "module"` field is recognized, but if set AVA will refuse to load test files with the `.js` extension.

For now, your best bet is to use the [`esm`](https://github.com/standard-things/esm) package. Make sure to use the `.js` extension and *do not* set `"type": "module"` in `package.json`.

Here's how you get it working with AVA.

First, install `esm`:

```
$ npm install esm
```

Configure it in your `package.json` or `ava.config.js` file, and add it to AVA's `"require"` option as well. Make sure to add it as the first item.

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
