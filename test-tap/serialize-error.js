import {test} from 'tap';

import * as avaAssert from '../lib/assert.js';
import serializeError from '../lib/serialize-error.js';
import {set as setOptions} from '../lib/worker/options.cjs';

setOptions({});

const serialize = error => serializeError('Test', true, error, import.meta.url);

test('serialize standard props', t => {
	const error = new Error('Hello');
	const serializedError = serialize(error);

	t.equal(Object.keys(serializedError).length, 9);
	t.equal(serializedError.avaAssertionError, false);
	t.equal(serializedError.nonErrorObject, false);
	t.same(serializedError.object, {});
	t.equal(serializedError.name, 'Error');
	t.equal(serializedError.stack, error.stack);
	t.equal(serializedError.message, 'Hello');
	t.equal(serializedError.summary, 'Error: Hello');
	t.equal(serializedError.shouldBeautifyStack, true);
	t.equal(serializedError.source.isWithinProject, true);
	t.equal(serializedError.source.isDependency, false);
	t.equal(typeof serializedError.source.file, 'string');
	t.equal(typeof serializedError.source.line, 'number');
	t.end();
});

test('additional error properties are preserved', t => {
	const serializedError = serialize(Object.assign(new Error(), {foo: 'bar'}));
	t.same(serializedError.object, {foo: 'bar'});
	t.end();
});

test('source file is an absolute path', t => {
	const error = new Error('Hello');
	const serializedError = serialize(error);

	t.equal(serializedError.source.file, import.meta.url);
	t.end();
});

test('sets avaAssertionError to true if indeed an assertion error', t => {
	const error = new avaAssert.AssertionError({});
	const serializedError = serialize(error);
	t.ok(serializedError.avaAssertionError);
	t.end();
});

test('includes values of assertion errors', t => {
	const error = new avaAssert.AssertionError({
		assertion: 'is',
		values: [{label: 'actual:', formatted: '1'}, {label: 'expected:', formatted: 'a'}],
	});

	const serializedError = serialize(error);
	t.equal(serializedError.values, error.values);
	t.end();
});

test('remove non-string error properties', t => {
	const error = {
		name: [42],
		stack: /re/g,
	};
	const serializedError = serialize(error);
	t.equal(serializedError.name, undefined);
	t.equal(serializedError.stack, undefined);
	t.end();
});

test('creates multiline summaries for syntax errors', t => {
	const error = new SyntaxError();
	Object.defineProperty(error, 'stack', {
		value: 'Hello\nThere\nSyntaxError here\nIgnore me',
	});
	const serializedError = serialize(error);
	t.equal(serializedError.name, 'SyntaxError');
	t.equal(serializedError.summary, 'Hello\nThere\nSyntaxError here');
	t.end();
});
