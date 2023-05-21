# TypeScript

Translations: [Español](https://github.com/avajs/ava-docs/blob/main/es_ES/docs/recipes/typescript.md), [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/docs/recipes/typescript.md), [Italiano](https://github.com/avajs/ava-docs/blob/main/it_IT/docs/recipes/typescript.md), [Русский](https://github.com/avajs/ava-docs/blob/main/ru_RU/docs/recipes/typescript.md), [简体中文](https://github.com/avajs/ava-docs/blob/main/zh_CN/docs/recipes/typescript.md)

AVA comes bundled with a TypeScript definition file. This allows developers to leverage TypeScript for writing tests.

This guide assumes you've already set up TypeScript for your project. Note that AVA's definition expects at least version 4.7.

## Enabling AVA's support for TypeScript test files

Broadly speaking, there are two ways to run tests written in TypeScript:

1. Build first, then test against the build output
2. Configure loaders which build test files as they're loaded

**The first option is the most reliable since it doesn't rely on experimental Node.js features.** You can use our [`@ava/typescript`] package, which is designed to work for projects that precompile TypeScript using the `tsc` command. Please see [`@ava/typescript`] for setup instructions. **This package also sets up the various TypeScript file extensions for you.**

**You can use loaders, but you're largely on your own. [Please post questions to our Discussions forum if you're stuck](https://github.com/avajs/ava/discussions/categories/q-a).**

There are two components to a setup like this:

1. [Make sure AVA recognizes the extensions of your TypeScript files](../06-configuration.md#configuring-module-formats)
2. Install the loader [through `nodeArguments`](../06-configuration.md#node-arguments)

[`tsx`](https://github.com/esbuild-kit/tsx) may be the best loader available. The setup, assuming your TypeScript config outputs ES modules, would look like this:

`package.json`:

```json
"ava": {
    "extensions": {
      "ts": "module"
    },
    "nodeArguments": [
      "--loader=tsx"
    ]
  }
```

## Writing tests

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/avajs/ava/tree/main/examples/typescript-basic?file=source%2Ftest.ts&terminal=test&view=editor)

Create a `test.ts` file. ESM syntax works best, even if you're targeting CommonJS.

```ts
import test from 'ava';

const fn = () => 'foo';

test('fn() returns foo', t => {
	t.is(fn(), 'foo');
});
```

You can use CommonJS syntax as well:

```ts
const test = require('ava');
```

This works whether `esModuleInterop` is enabled or not.

`import … = require()` syntax is less elegant. It's best like this:

```ts
import ava = require('ava')

const test = ava.default;
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

[`@ava/typescript`]: https://github.com/avajs/typescript
