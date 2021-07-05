# TypeScript

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/typescript.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/typescript.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/docs/recipes/typescript.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/docs/recipes/typescript.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/docs/recipes/typescript.md)

AVA comes bundled with a TypeScript definition file. This allows developers to leverage TypeScript for writing tests.

This guide assumes you've already set up TypeScript for your project. Note that AVA 3's definition expects at least version 3.7.5. AVA 4 will require at least version 4.2.

## Enabling AVA's support for TypeScript test files

### With precompile step

Out of the box AVA does not load TypeScript test files. You can use our [`@ava/typescript`] package, which is designed to work for projects that precompile TypeScript using the `tsc` command. Please see [`@ava/typescript`] for setup instructions.

### Using `ts-node`

You can use [`ts-node`] to do live testing without transpiling. This can be especially helpful when you're using a bundler. Be sure to install the required dev dependencies:

`npm install --save-dev typescript ts-node`

Then, depending on whether or not your package is of type `module` or not, the required setup differs. See either:

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
		"nonSemVerExperiments": {
			"configurableModuleFormat": true
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

And finally, even though you directly import code from your TypeScript files, you **must** import it from your `.ts` files with the `.js` extension instead!

For example if your source file is `index.ts` looks like this:

```ts
export function myFunction() {}
```

Then in your AVA test files you must import it **as if it has the `.js` extension** it like so:

```ts
import {myFunction} from './index.js';
```

The reason that you need to write `.js` to import `.ts` files in your AVA test files, is explained by the `ts-node` author [in this post](https://github.com/nodejs/modules/issues/351#issuecomment-621257543).

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

### AVA 3

With AVA 3, in order to be able to assign the `title` property to a macro you need to type the function:

```ts
import test, {Macro} from 'ava';

const macro: Macro<[string, number]> = (t, input, expected) => {
	t.is(eval(input), expected);
};
macro.title = (providedTitle = '', input, expected) => `${providedTitle} ${input} = ${expected}`.trim();

test(macro, '2 + 2', 4);
test(macro, '2 * 3', 6);
test('providedTitle', macro, '3 * 3', 9);
```

You'll need a different type if you're expecting your macro to be used with an AVA 3 callback test:

```ts
import test, {CbMacro} from 'ava';

const macro: CbMacro<[]> = t => {
	t.pass();
	setTimeout(t.end, 100);
};

test.cb(macro);
```

### AVA 4

With AVA 4 you can use the `test.macro()` helper to create macros:

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

By default, the type of `t.context` will be the empty object (`{}`). AVA exposes an interface `TestInterface<Context>` which you can use to apply your own type to `t.context`. This can help you catch errors at compile-time:

```ts
import anyTest, {TestInterface} from 'ava';

const test = anyTest as TestInterface<{foo: string}>;

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

You can also type the context when creating macros:

```ts
import anyTest, {Macro, TestInterface} from 'ava';

interface Context {
	foo: string
}

const test = anyTest as TestInterface<Context>;

const macro: Macro<[string], Context> = (t, expected: string) => {
	t.is(t.context.foo, expected);
};

test.beforeEach(t => {
	t.context = {foo: 'bar'};
});

test('foo is bar', macro, 'bar');
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
