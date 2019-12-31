# Using ES modules in AVA

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/es-modules.md)

As of Node.js 8.5.0, [ES modules](http://2ality.com/2017/09/native-esm-node.html) are natively supported, but behind the `--experimental-modules` command line flag. It works using the `.mjs` file extension. AVA does not currently support the command line option or the new file extension, but you *can* use the [`esm`](https://github.com/standard-things/esm) module to use the new syntax.

Here's how you get it working with AVA.

First, install [`esm`](https://github.com/standard-things/esm):

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
// sum.mjs
export default function sum(a, b) {
	return a + b;
};
```

```js
// test.js
const test = require('ava');
const sum = require('./sum.mjs');

test('2 + 2 = 4', t => {
	t.is(sum(2, 2), 4);
});
```

You need to configure AVA to recognize `.mjs` extensions;

**`package.json`:**

```json
{
	"ava": {
		"extensions": [
			"js",
			"mjs"
		]
	}
}
```
