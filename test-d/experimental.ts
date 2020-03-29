import {expectError} from 'tsd';
import test, {ExecutionContext, Implementation, ImplementationWithArgs} from '../experimental';

test('title', t => t.pass());

expectError(test<[string]>('explicit argument type', t => t.pass(), 42));

expectError(test<[string]>('missing argument', (t: ExecutionContext) => t.pass()));

test<string[]>('optional arguments', t => t.pass());
test<string[]>('optional arguments, with values', t => t.pass(), 'foo', 'bar');

expectError(test('argument type inferred from implementation', (t, string) => t.is(string, 'foo'), 42));

expectError(test('argument type inferred in implementation', (t, string) => t.is(string, 'foo'), 42));

{
	const implementation: Implementation = t => t.pass();
	expectError(test('unexpected arguments', implementation, 'foo'));
}

{
	const implementation: ImplementationWithArgs<[string]> = (t, string) => t.is(string, 'foo');
	test('unexpected arguments', implementation, 'foo');
}

test.failing<[string]>('failing test with arguments', (t, string) => t.is(string, 'foo'), 'foo');
test.only<[string]>('only test with arguments', (t, string) => t.is(string, 'foo'), 'foo');
test.skip<[string]>('serial test with arguments', (t, string) => t.is(string, 'foo'), 'foo');

test.after.always.skip<[string]>('after.always hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.after.always.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.after.always<[string]>('after.always hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.after.always<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.after.skip<[string]>('after hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.after.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.after<[string]>('after hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.after<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.afterEach.always.skip<[string]>('after.always hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.afterEach.always.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.afterEach.always<[string]>('after.always hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.afterEach.always<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.afterEach.skip<[string]>('after hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.afterEach.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.afterEach<[string]>('after hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.afterEach<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.before.skip<[string]>('before hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.before.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.before<[string]>('before hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.before<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.beforeEach.skip<[string]>('before hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.beforeEach.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.beforeEach<[string]>('before hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.beforeEach<[string]>((t, string) => t.is(string, 'foo'), 'foo');

test.serial('title', t => t.pass());

expectError(test.serial<[string]>('explicit argument type', t => t.pass(), 42));

expectError(test.serial<[string]>('missing argument', (t: ExecutionContext) => t.pass()));

test.serial<string[]>('optional arguments', t => t.pass());
test.serial<string[]>('optional arguments, with values', t => t.pass(), 'foo', 'bar');

expectError(test.serial('argument type inferred from implementation', (t, string) => t.is(string, 'foo'), 42));

expectError(test.serial('argument type inferred in implementation', (t, string) => t.is(string, 'foo'), 42));

{
	const implementation: Implementation = t => t.pass();
	expectError(test.serial('unexpected arguments', implementation, 'foo'));
}

{
	const implementation: ImplementationWithArgs<[string]> = (t, string) => t.is(string, 'foo');
	test.serial('unexpected arguments', implementation, 'foo');
}

test.serial.failing<[string]>('failing test with arguments', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.only<[string]>('only test with arguments', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.skip<[string]>('serial test with arguments', (t, string) => t.is(string, 'foo'), 'foo');

test.serial.after.always.skip<[string]>('after.always hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.after.always.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.after.always<[string]>('after.always hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.after.always<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.after.skip<[string]>('after hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.after.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.after<[string]>('after hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.after<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.afterEach.always.skip<[string]>('after.always hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.afterEach.always.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.afterEach.always<[string]>('after.always hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.afterEach.always<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.afterEach.skip<[string]>('after hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.afterEach.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.afterEach<[string]>('after hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.afterEach<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.before.skip<[string]>('before hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.before.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.before<[string]>('before hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.before<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.beforeEach.skip<[string]>('before hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.beforeEach.skip<[string]>((t, string) => t.is(string, 'foo'), 'foo');
test.serial.beforeEach<[string]>('before hook with args', (t, string) => t.is(string, 'foo'), 'foo');
test.serial.beforeEach<[string]>((t, string) => t.is(string, 'foo'), 'foo');
