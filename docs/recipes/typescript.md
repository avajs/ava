# TypeScript

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/typescript.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/typescript.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/docs/recipes/typescript.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/docs/recipes/typescript.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/docs/recipes/typescript.md)

AVA comes bundled with a TypeScript definition file. This allows developers to leverage TypeScript for writing tests.


## Setup

First install [TypeScript](https://github.com/Microsoft/TypeScript) (if you already have it installed, make sure you use version 2.1 or greater).

```
$ npm install --save-dev typescript
```

Create a [`tsconfig.json`](http://www.typescriptlang.org/docs/handbook/tsconfig-json.html) file. This file specifies the compiler options required to compile the project or the test file.

```json
{
	"compilerOptions": {
		"module": "commonjs",
		"target": "es2015",
		"sourceMap": true
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

const fn = async () => Promise.resolve('foo');

test(async (t) => {
	t.is(await fn(), 'foo');
});
```

## Working with [macros](https://github.com/avajs/ava#test-macros)

In order to be able to assign the `title` property to a macro:

```ts
import test, { AssertContext, Macro } from 'ava';

const macro: Macro<AssertContext> = (t, input, expected) => {
	t.is(eval(input), expected);
}

macro.title = (providedTitle, input, expected) => `${providedTitle} ${input} = ${expected}`.trim();

test(macro, '2 + 2', 4);
test(macro, '2 * 3', 6);
test('providedTitle', macro, '3 * 3', 9);
```

## Working with [`context`](https://github.com/avajs/ava#test-context)

By default, the type of `t.context` will be [`any`](https://www.typescriptlang.org/docs/handbook/basic-types.html#any). AVA exposes an interface `RegisterContextual<T>` which you can use to apply your own type to `t.context`. This can help you catch errors at compile-time:

```ts
import * as ava from 'ava';

function contextualize<T>(getContext: () => T): ava.RegisterContextual<T> {
	ava.test.beforeEach(t => {
		Object.assign(t.context, getContext());
	});

	return ava.test;
}

const test = contextualize(() => ({ foo: 'bar' }));

test.beforeEach(t => {
	t.context.foo = 123; // error:  Type '123' is not assignable to type 'string'
});

test.after.always.failing.cb.serial('very long chains are properly typed', t => {
	t.context.fooo = 'a value'; // error: Property 'fooo' does not exist on type '{ foo: string }'
});

test('an actual test', t => {
	t.deepEqual(t.context.foo.map(c => c), ['b', 'a', 'r']); // error: Property 'map' does not exist on type 'string'
});
```


## Execute the tests

```
$ npm test
```
