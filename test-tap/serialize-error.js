'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({});

const {test} = require('tap');
const avaAssert = require('../lib/assert');
const serializeError = require('../lib/serialize-error');

const serialize = error => serializeError('Test', true, error, __filename);

test('serialize standard props', t => {
	const error = new Error('Hello');
	const serializedError = serialize(error);

	t.is(Object.keys(serializedError).length, 9);
	t.is(serializedError.avaAssertionError, false);
	t.is(serializedError.nonErrorObject, false);
	t.deepEqual(serializedError.object, {});
	t.is(serializedError.name, 'Error');
	t.is(serializedError.stack, error.stack);
	t.is(serializedError.message, 'Hello');
	t.is(serializedError.summary, 'Error: Hello');
	t.is(serializedError.shouldBeautifyStack, true);
	t.is(serializedError.source.isWithinProject, true);
	t.is(serializedError.source.isDependency, false);
	t.is(typeof serializedError.source.file, 'string');
	t.is(typeof serializedError.source.line, 'number');
	t.end();
});

test('additional error properties are preserved', t => {
	const serializedError = serialize(Object.assign(new Error(), {foo: 'bar'}));
	t.deepEqual(serializedError.object, {foo: 'bar'});
	t.end();
});

test('source file is an absolute path', t => {
	const error = new Error('Hello');
	const serializedError = serialize(error);

	t.is(serializedError.source.file, __filename);
	t.end();
});

test('sets avaAssertionError to true if indeed an assertion error', t => {
	const error = new avaAssert.AssertionError({});
	const serializedError = serialize(error);
	t.true(serializedError.avaAssertionError);
	t.end();
});

test('includes statements of assertion errors', t => {
	const error = new avaAssert.AssertionError({
		assertion: 'true'
	});
	error.statements = [
		['actual.a[0]', '1'],
		['actual.a', '[1]'],
		['actual', '{a: [1]}']
	];

	const serializedError = serialize(error);
	t.is(serializedError.statements, error.statements);
	t.end();
});

test('includes values of assertion errors', t => {
	const error = new avaAssert.AssertionError({
		assertion: 'is',
		values: [{label: 'actual:', formatted: '1'}, {label: 'expected:', formatted: 'a'}]
	});

	const serializedError = serialize(error);
	t.is(serializedError.values, error.values);
	t.end();
});

test('remove non-string error properties', t => {
	const error = {
		name: [42],
		stack: /re/g
	};
	const serializedError = serialize(error);
	t.is(serializedError.name, undefined);
	t.is(serializedError.stack, undefined);
	t.end();
});

test('creates multiline summaries for syntax errors', t => {
	const error = new SyntaxError();
	Object.defineProperty(error, 'stack', {
		value: 'Hello\nThere\nSyntaxError here\nIgnore me'
	});
	const serializedError = serialize(error);
	t.is(serializedError.name, 'SyntaxError');
	t.is(serializedError.summary, 'Hello\nThere\nSyntaxError here');
	t.end();
});
