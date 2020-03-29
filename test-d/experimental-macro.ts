import {expectError} from 'tsd';
import test, {TestInterface} from '../experimental';

{
	const macro = test.macro(t => t.pass());
	test(macro);
	test('title', macro);
	test.serial(macro);
	test.serial('title', macro);
	expectError(test(macro, 'foo'));
	expectError(test('title', macro, 'foo'));
	expectError(test.serial(macro, 'foo'));
	expectError(test.serial('title', macro, 'foo'));
}

{
	const macro = test.serial.macro(t => t.pass());
	test(macro);
	test.serial(macro);
}

{
	const macro = test.macro<[string]>((t, string) => t.is(string, 'foo'));
	test(macro, 'foo');
	test('title', macro, 'foo');
	test.serial(macro, 'foo');
	test.serial('title', macro, 'foo');
	expectError(test(macro));
	expectError(test('title', macro));
	expectError(test.serial(macro));
	expectError(test.serial('title', macro));
}

{
	const macro = test.macro<[string]>({
		exec: (t, string) => t.is(string, 'foo')
	});
	test(macro, 'foo');
	test('title', macro, 'foo');
	test.serial(macro, 'foo');
	test.serial('title', macro, 'foo');
	expectError(test.serial(macro));
	expectError(test.serial('title', macro));
}

{
	const macro = test.macro<[string]>({
		exec: (t, string) => t.is(string, 'foo'),
		title: (prefix, string) => `${prefix ?? 'title'} ${string}`
	});
	test(macro, 'foo');
	test('title', macro, 'foo');
	test.serial(macro, 'foo');
	test.serial('title', macro, 'foo');
	expectError(test(macro));
	expectError(test('title', macro));
	expectError(test.serial(macro));
	expectError(test.serial('title', macro));
}

test.serial.macro<[], { str: string }>(t => t.is(t.context.str, 'foo'));
test.serial.macro<[string], { str: string }>((t, string) => t.is(t.context.str, string));
(test as TestInterface<{ str: string }>).macro(t => t.is(t.context.str, 'foo'));
(test as TestInterface<{ str: string }>).macro<[string]>((t, string) => t.is(t.context.str, string));

{
	const macro = test.macro<[], { foo: string }>(t => t.is(t.context.foo, 'foo'));
	// ;(test as TestInterface<{foo: string, bar: string}>)(macro)
	expectError((test as TestInterface<{bar: string}>)(macro));
}

{
	const macro = test.macro(t => t.pass());
	expectError(test.before(macro));
	expectError(test.beforeEach(macro));
	expectError(test.after(macro));
	expectError(test.after.always(macro));
	expectError(test.afterEach(macro));
	expectError(test.afterEach.always(macro));
}
