import {expectError, expectType} from 'tsd';
import anyTest, {Macro, TestInterface} from '..';

interface Context {
	foo: string;
}

const test = anyTest as TestInterface<Context>; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion

const macro: Macro<[number], Context> = (t, expected) => {
	expectType<string>(t.context.foo);
	expectType<number>(expected);
};

test.beforeEach(t => {
	expectType<Context>(t.context);
});

expectError(test('foo is bar', macro, 'bar'));

anyTest('default context is unknown', t => {
	expectType<unknown>(t.context);
});
