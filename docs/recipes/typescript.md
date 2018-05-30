# TypeScript

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/docs/recipes/typescript.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/docs/recipes/typescript.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/docs/recipes/typescript.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/docs/recipes/typescript.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/docs/recipes/typescript.md)

AVA comes bundled with a TypeScript definition file. This allows developers to leverage TypeScript for writing tests.

This guide assumes you've already set up TypeScript for your project. Note that AVA's definition has been tested with version 2.8.3.

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

test(async (t) => {
	t.is(await fn(), 'foo');
});
```

## Using [macros](https://github.com/avajs/ava#test-macros)

In order to be able to assign the `title` property to a macro you need to type the function:

```ts
import test, {Macro} from 'ava';

const macro: Macro = (t, input: string, expected: number) => {
	t.is(eval(input), expected);
};
macro.title = (providedTitle: string, input: string, expected: number) => `${providedTitle} ${input} = ${expected}`.trim();

test(macro, '2 + 2', 4);
test(macro, '2 * 3', 6);
test('providedTitle', macro, '3 * 3', 9);
```

You'll need a different type if you're expecting your macro to be used with a callback test:

```ts
import test, {CbMacro} from 'ava';

const macro: CbMacro = t => {
	t.pass();
	setTimeout(t.end, 100);
};

test.cb(macro);
```

## Typing [`t.context`](https://github.com/avajs/ava#test-context)

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

const macro: Macro<Context> = (t, expected: string) => {
	t.is(t.context.foo, expected);
};

test.beforeEach(t => {
	t.context = {foo: 'bar'};
});

test('foo is bar', macro, 'bar');
```

Note that, despite the type cast above, when executing `t.context` is an empty object unless it's assigned.
