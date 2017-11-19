# ES Modules

As of Node.js 8.5.0, [ES modules](http://2ality.com/2017/09/native-esm-node.html) are natively supported, but behind a command line option `--experimental-modules`.

However, it works a bit different on Node.js than in web browsers that also natively supports ES modules. In Node.js, you need to use the `.mjs` extension instead of the commonly known `.js` extension. The `.mjs` extension in web browsers too, but they have to be served with the correct media type (`application/javascript`). There is a [ongoing effort](https://tools.ietf.org/html/draft-bfarias-javascript-mjs-00) on standardizing `.mjs`.

The good news is that there's a module called [`@std/esm`](https://github.com/standard-things/esm) that enable you to write and run ES modules in Node.js 4 and above.

Here's how you get it working with AVA.


## @std/esm

First, install [`@std/esm`](https://github.com/standard-things/esm):

```
$ npm install @std/esm
```

Modify your package.json accordingly:

```json
{
	…
	"scripts": {
		"test": "ava"
	},
	"dependencies": {
		"@std/esm": "^0.16.0"
	},
	"ava": {
		"require": [
			"@std/esm"
		]
	},
	"@std/esm": "cjs"
}
```

You can now use native ES modules with AVA:

```js
import test from 'ava';

test('2 + 2 = 4', t => {
	t.is(2 + 2, 4);
});
```


## @std/esm + TypeScript

For [TypeScript](https://github.com/Microsoft/TypeScript) users, first install the `typescript` package:

```
$ npm install --save-dev typescript
```

Then modify your `tsconfig.json` accordingly:

```json
{
	…
	"moduleResolution": "node",
	"module": "es2015",
	"target": "es2015"
}
```

Then add the `@std/esm` config to `package.json`:

```json
{
	…
	"scripts": {
		"test": "tsc && ava"
	},
	"dependencies": {
		"@std/esm": "^0.16.0"
	},
	"devDependencies": {
		"typescript": "^2.6.1"
	},
	"ava": {
		"require": [
			"@std/esm"
		]
	},
	"@std/esm": "cjs"
}
```

You can now write tests with AVA, `@std/esm`, and TypeScript:

```ts
// @ts-check
import test from 'ava';

test('2 + 2 = 4', t => {
		t.is(2 + 2, 4);
});
```


## Run the AVA test

```
$ npm run test
```
