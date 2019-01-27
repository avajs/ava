# TypeScript

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/typescript.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/typescript.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/docs/recipes/typescript.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/docs/recipes/typescript.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/docs/recipes/typescript.md)

AVA comes bundled with a TypeScript definition file. This allows developers to leverage TypeScript for writing tests.

This guide assumes you've already set up TypeScript for your project. Note that AVA's definition has been tested with version 3.2.4.

## Configuring AVA to compile TypeScript files on the fly

You can configure AVA to recognize TypeScript files. Then, with `ts-node` installed, you can compile them on the fly.

**`package.json`:**

```json
{
	"ava": {
		"compileEnhancements": false,
		"extensions": [
			"ts"
		],
		"require": [
			"ts-node/register"
		]
	}
}
```

It's worth noting that with this configuration tests will fail if there are TypeScript build errors. If you want to test while ignoring these errors you can use `ts-node/register/transpile-only` instead of `ts-node/register`.

## Compiling TypeScript files before running AVA

Add a `test` script in the `package.json` file. It will compile the project first and then run AVA.

```json
{
	"scripts": {
		"test": "tsc && ava"
	}
}
```

Make sure that AVA runs your built TypeScript files.

## Writing tests

Create a `test.ts` file.

```ts
import test from 'ava';

const fn = async () => Promise.resolve('foo');

test(async t => {
	t.is(await fn(), 'foo');
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

In order to be able to assign the `title` property to a macro you need to type the function:

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

You'll need a different type if you're expecting your macro to be used with a callback test:

```ts
import test, {CbMacro} from 'ava';

const macro: CbMacro<[]> = t => {
	t.pass();
	setTimeout(t.end, 100);
};

test.cb(macro);
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

test.serial.cb.failing('very long chains are properly typed', t => {
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
