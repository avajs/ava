# TypeScript

Translations: [Français](https://github.com/sindresorhus/ava-docs/blob/master/fr_FR/docs/recipes/typescript.md), [Русский](https://github.com/sindresorhus/ava-docs/blob/master/ru_RU/docs/recipes/typescript.md)

AVA comes bundled with a TypeScript definition file. This allows developers to leverage TypeScript for writing tests.

## Setup

First install the TypeScript compiler [tsc](https://github.com/Microsoft/TypeScript).

```
$ npm install --save-dev tsc
```

Create a [`tsconfig.json`](https://github.com/Microsoft/TypeScript/wiki/tsconfig.json) file. This file specifies the compiler options required to compile the project or the test file.

```json
{
	"compilerOptions": {
		"module": "commonjs",
		"target": "es2015"
	}
}
```

Add a `test` script in the `package.json` file. It will compile the project first and then run AVA.

```json
{
  "scripts": {
    "test": "tsc && ava"
  }
}
```


## Add tests

Create a `test.ts` file.

```ts
import test from 'ava';

async function fn() {
    return Promise.resolve('foo');
}

test(async (t) => {
    t.is(await fn(), 'foo');
});
```


## Execute the tests

```
$ npm test
```
