import {isNativeError} from 'node:util/types';

import {test} from 'tap';

import {AssertionError} from '../lib/assertion-error.js';
import {formatThrownValue} from '../lib/format-error.js';
import serializeError from '../lib/serialize-error.js';

test('formatThrownValue falls back when concordance prints sparse DOMException', t => {
	const error = new DOMException('Invalid selector', 'SyntaxError');
	const formatted = formatThrownValue(error);
	t.notMatch(formatted, /^\S+ \{\}$/);
	t.match(formatted, /Invalid selector/);
	t.end();
});

test('serializeError keeps cross-realm Error details for reporters', t => {
	const error = Object.create(Error.prototype);
	error.name = 'DOMException';
	error.message = 'Invalid selector';
	Object.defineProperty(error, 'stack', {
		configurable: true,
		value: 'DOMException: Invalid selector\n    at fixture (file:///tmp/fixture.js:1:1)',
	});

	t.equal(isNativeError(error), false);
	t.ok(error instanceof Error);

	const serialized = serializeError(error, {testFile: '/tmp/fixture.js'});
	t.equal(serialized.type, 'native');
	t.equal(serialized.name, 'DOMException');
	t.equal(serialized.message, 'Invalid selector');
	t.match(serialized.stack, /Invalid selector/);

	const cloned = structuredClone(serialized.originalError);
	t.equal(cloned.name, 'DOMException');
	t.equal(cloned.message, 'Invalid selector');
	t.end();
});

test('serializeError uses cause stack for AssertionError wrapping host errors', t => {
	const cause = Object.create(Error.prototype);
	cause.name = 'DOMException';
	cause.message = 'Invalid selector';
	Object.defineProperty(cause, 'stack', {
		configurable: true,
		value: 'DOMException: Invalid selector\n    at fixture (file:///tmp/fixture.js:2:1)',
	});

	const error = new AssertionError('Error thrown in test', {
		assertionStack: '',
		cause,
		formattedDetails: [{label: 'Error thrown in test:', formatted: formatThrownValue(cause)}],
	});

	const serialized = serializeError(error, {testFile: '/tmp/fixture.js'});
	t.equal(serialized.type, 'ava');
	t.match(serialized.stack, /Invalid selector/);
	t.match(serialized.formattedDetails[0].formatted, /Invalid selector/);
	t.notMatch(serialized.formattedDetails[0].formatted, /^\S+ \{\}$/);
	t.end();
});
