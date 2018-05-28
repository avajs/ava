# Using ES modules in AVA

Translations: [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/es-modules.md)

As of Node.js 8.5.0, [ES modules](http://2ality.com/2017/09/native-esm-node.html) are natively supported, but behind the `--experimental-modules` command line flag. It works using the `.mjs` file extension. AVA does not currently support the command line option or the new file extension, but you *can* use the [`esm`](https://github.com/standard-things/esm) module to use the new syntax.

Here's how you get it working with AVA.

First, install [`esm`](https://github.com/standard-things/esm):

```
$ npm install esm
```

Configure it in your `package.json` file, and add it to AVA's `"require"` option as well. Make sure to add it as the first item:

```json
{
	"ava": {
		"require": [
			"esm"
		]
	}
}
```

By default AVA converts ES module syntax to CommonJS. [You can disable this](./babel.md#preserve-es-module-syntax).

You can now use native ES modules with AVA:

```js
// sum.mjs
export default function sum(a, b) {
	return a + b;
};
```

```js
// test.js
import test from 'ava';
import sum from './sum.mjs';

test('2 + 2 = 4', t => {
	t.is(sum(2, 2), 4);
});
```

You need to configure AVA to recognize `.mjs` extensions. If you want AVA to apply its Babel presets use:

```json
{
	"ava": {
		"babel": {
			"extensions": [
				"js",
				"mjs"
			]
		}
	}
}
```

Alternatively you can use:

```json
{
	"ava": {
		"babel": false,
		"extensions": [
			"js",
			"mjs"
		]
	}
}
```

Or leave Babel enabled (which means it's applied to `.js` files), but don't apply it to `.mjs` files:

```json
{
	"ava": {
		"extensions": [
			"mjs"
		]
	}
}
```
