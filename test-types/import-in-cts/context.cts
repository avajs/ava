/* eslint-disable @typescript-eslint/no-empty-function */
import anyTest, {ExecutionContext, TestFn} from 'ava';
import {expectError, expectType} from 'tsd';

interface Context {
	foo: string;
}

const test = anyTest as TestFn<Context>;

const macro = test.macro((t, _expected: number) => {
	expectType<string>(t.context.foo);
});

test.beforeEach(t => {
	expectType<Context>(t.context);
});

// @ts-expect-error TS2769
expectError(test('foo is bar', macro, 'bar')); // eslint-disable-line @typescript-eslint/no-confusing-void-expression

anyTest('default context is unknown', t => {
	expectType<unknown>(t.context);
});

// See https://github.com/avajs/ava/issues/2253
interface Covariant extends Context {
	bar: number;
}

const test2 = anyTest as TestFn<Covariant>;
const hook = (_t: ExecutionContext<Context>) => {};
test2.beforeEach(hook);
