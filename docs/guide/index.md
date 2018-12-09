# Set Up

## Installation

To install and set up AVA, run:

```console
npx create-ava --next
```

Your `package.json` will then look like this (exact version notwithstanding):

```json
{
	"name": "awesome-package",
	"scripts": {
		"test": "ava"
	},
	"devDependencies": {
		"ava": "1.0.0-beta.4"
	}
}
```

Or if you prefer using Yarn:

```console
yarn add ava@next --dev --exact
```

Alternatively you can install `ava` manually:

```console
npm install --save-dev --save-exact ava@next
```

Don't forget to configure the `test` script in your `package.json` as per above.

## Create your test file

Create a file named `test.js` in the project root directory:

```js
import test from 'ava';

test('foo', t => {
	t.pass();
});

test('bar', async t => {
	const bar = Promise.resolve('bar');
	t.is(await bar, 'bar');
});
```

## Running your tests

```console
npm test
```

Or with `npx`:

```console
npx ava
```

Run with the `--watch` flag to enable AVA's [watch mode](/recipes/watch-mode.md):

```console
npx ava --watch
```
