import {expectError, expectType} from 'tsd';

import anyTest, {ExecutionContext, TestFn} from '..';

interface Context {
	foo: string;
}

const test = anyTest as TestFn<Context>;

const macro = test.macro((t, expected: number) => {
	expectType<string>(t.context.foo);
});

test.beforeEach(t => {
	expectType<Context>(t.context);
});

expectError(test('foo is bar', macro, 'bar')); // eslint-disable-line @typescript-eslint/no-confusing-void-expression

anyTest('default context is unknown', t => {
	expectType<unknown>(t.context);
});

// See https://github.com/avajs/ava/issues/2253
interface Covariant extends Context {
	bar: number;
}

const test2 = anyTest as TestFn<Covariant>;
const hook = (t: ExecutionContext<Context>) => {};
test2.beforeEach(hook);
