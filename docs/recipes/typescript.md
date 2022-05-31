# TypeScript

Translations: [Español](https://github.com/avajs/ava-docs/blob/main/es_ES/docs/recipes/typescript.md), [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/typescript.md), [Italiano](https://github.com/avajs/ava-docs/blob/main/it_IT/docs/recipes/typescript.md), [Русский](https://github.com/avajs/ava-docs/blob/main/ru_RU/docs/recipes/typescript.md), [简体中文](https://github.com/avajs/ava-docs/blob/main/zh_CN/docs/recipes/typescript.md)

AVA comes bundled with a TypeScript definition file. This allows developers to leverage TypeScript for writing tests.

This guide assumes you've already set up TypeScript for your project. Note that AVA's definition expects at least version 4.4.

## Enabling AVA's support for TypeScript test files

### With precompile step

Out of the box AVA does not load TypeScript test files. You can use our [`@ava/typescript`] package, which is designed to work for projects that precompile TypeScript using the `tsc` command. Please see [`@ava/typescript`] for setup instructions.

### Using `ts-node`

You can use [`ts-node`] to do live testing without transpiling. This can be especially helpful when you're using a bundler. Be sure to install the required dev dependencies:

`npm install --save-dev typescript ts-node`

The required setup depends on the type of your package:

1. [for packages with type "module"](#for-packages-with-type-module)
2. [for packages without type "module"](#for-packages-without-type-module)

#### For packages with type `module`

If your `package.json` has `"type": "module"`, then this is the AVA configuration you need:

`package.json`:

```json
{
	"ava": {
		"extensions": {
			"ts": "module"
		},
		"nodeArguments": [
			"--loader=ts-node/esm"
		]
	}
}
```

You also need to have this in your `tsconfig.json`:

```json
{
	"compilerOptions": {
		"module": "ES2020",
		"moduleResolution": "node"
	}
}
```

Remember that, by default, ES modules require you to specify the file extension and TypeScript outputs `.js` files, so you have to write your imports to load from `.js` files not `.ts`.

If this is not to your liking there is an _experimental_ option in Node.js that you might want to use. You can add it to the `nodeArguments` array in the AVA configuration so it applies to your test runs: [`--experimental-specifier-resolution=node`](https://nodejs.org/api/esm.html#customizing-esm-specifier-resolution-algorithm).

#### For packages without type "module"

If your `package.json` does not have `"type": "module"`, then this is the AVA configuration you need:

`package.json`:

```json
{
	"ava": {
		"extensions": [
			"ts"
		],
		"require": [
			"ts-node/register"
		]
	}
}
```

It's worth noting that with this configuration, tests will fail if there are TypeScript build errors. If you want to test while ignoring these errors you can use `ts-node/register/transpile-only` instead of `ts-node/register`.

## Writing tests

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/avajs/ava/tree/main/examples/typescript-basic?file=source%2Ftest.ts&terminal=test&view=editor)

Create a `test.ts` file.

```ts
import test from 'ava';

const fn = () => 'foo';

test('fn() returns foo', t => {
	t.is(fn(), 'foo');
});
```

## Using [macros](../01-writing-tests.md#reusing-test-logic-through-macros)

Macros can receive additional arguments. AVA can infer these to ensure you're using the macro correctly:

```ts
import test, {ExecutionContext} from 'ava';

const hasLength = (t: ExecutionContext, input: string, expected: number) => {
	t.is(input.length, expected);
};

test('bar has length 3', hasLength, 'bar', 3);
```

However if you use the `test.macro()` helper you get much better type inference:

```ts
import test from 'ava';

const macro = test.macro((t, input: string, expected: number) => {
	t.is(eval(input), expected);
});

test('title', macro, '3 * 3', 9);
```

Or with a title function:

```ts
import test from 'ava';

const macro = test.macro({
	exec(t, input: string, expected: number) {
		t.is(eval(input), expected);
	},
	title(providedTitle = '', input, expected) {
		return `${providedTitle} ${input} = ${expected}`.trim();
	}
});

test(macro, '2 + 2', 4);
test(macro, '2 * 3', 6);
test('providedTitle', macro, '3 * 3', 9);
```

## Typing [`t.context`](../01-writing-tests.md#test-context)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/avajs/ava/tree/main/examples/typescript-context?file=source%2Ftest.ts&terminal=test&view=editor)

By default, the type of `t.context` will be the empty object (`{}`). AVA exposes an interface `TestFn<Context>` which you can use to apply your own type to `t.context`. This can help you catch errors at compile-time:

```ts
import anyTest, {TestFn} from 'ava';

const test = anyTest as TestFn<{foo: string}>;

test.beforeEach(t => {
	t.context = {foo: 'bar'};
});

test.beforeEach(t => {
	t.context.foo = 123; // error:  Type '123' is not assignable to type 'string'
});

test.serial.failing('very long chains are properly typed', t => {
	t.context.fooo = 'a value'; // error: Property 'fooo' does not exist on type ''
});

test('an actual test', t => {
	t.deepEqual(t.context.foo.map(c => c), ['b', 'a', 'r']); // error: Property 'map' does not exist on type 'string'
});
```

Note that, despite the type cast above, when executing `t.context` is an empty object unless it's assigned.

## Typing `throws` assertions

The `t.throws()` and `t.throwsAsync()` assertions are typed to always return an Error. You can customize the error class using generics:

```ts
import test from 'ava';

class CustomError extends Error {
	parent: Error

	constructor(parent) {
		super(parent.message);
		this.parent = parent;
	}
}

function myFunc() {
	throw new CustomError(new TypeError('🙈'));
};

test('throws', t => {
	const err = t.throws<CustomError>(myFunc);
	t.is(err.parent.name, 'TypeError');
});

test('throwsAsync', async t => {
	const err = await t.throwsAsync<CustomError>(async () => myFunc());
	t.is(err.parent.name, 'TypeError');
});
```

Note that, despite the typing, the assertion returns `undefined` if it fails. Typing the assertions as returning `Error | undefined` didn't seem like the pragmatic choice.

### Using module path mapping

`ts-node` [does not support module path mapping](https://github.com/TypeStrong/ts-node/issues/138), however you can use [`tsconfig-paths`](https://github.com/dividab/tsconfig-paths#readme).

Once installed, add the `tsconfig-paths/register` entry to the `require` section of AVA's config:

`package.json`:

```json
{
	"ava": {
		"extensions": [
			"ts"
		],
		"require": [
			"ts-node/register",
			"tsconfig-paths/register"
		]
	}
}
```

Then you can start using module aliases:

`tsconfig.json`:
```json
{
	"baseUrl": ".",
	"paths": {
		"@helpers/*": ["helpers/*"]
	}
}
```

Test:

```ts
import myHelper from '@helpers/myHelper';

// Rest of the file
```

[`@ava/typescript`]: https://github.com/avajs/typescript
[`ts-node`]: https://www.npmjs.com/package/ts-node
