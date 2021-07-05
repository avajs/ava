import {expectError, expectType} from 'tsd';

import anyTest, {Macro, TestInterface} from '..';

interface Context {
	foo: string;
}

const test = anyTest as TestInterface<Context>; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion

const macro = test.macro((t, expected: number) => {
	expectType<string>(t.context.foo);
});

test.beforeEach(t => {
	expectType<Context>(t.context);
});

expectError(test('foo is bar', macro, 'bar'));

anyTest('default context is unknown', t => {
	expectType<unknown>(t.context);
});

// See https://github.com/avajs/ava/issues/2253
interface Covariant extends Context {
	bar: number;
}

const test2 = anyTest as TestInterface<Covariant>; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
const hook = (t: ExecutionContext<Context>) => {};
test2.beforeEach(hook);
