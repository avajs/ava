import path from 'node:path';
import {pathToFileURL} from 'node:url';

import test from '@ava/test';

import serializeError from '../lib/serialize-error.js';

test('extractSource skips stack frames without a file path', t => {
	const testFilePath = path.resolve('test-fixture.js');
	const testFile = pathToFileURL(testFilePath).toString();
	const error = new Error('boom');
	// Stack-utils leaves `file` undefined for native frames; previously
	// normalizeFile(undefined) threw and hid the original test failure.
	error.stack = `Error: boom
    at Function.foo (native)
    at Object.<anonymous> (${testFilePath}:10:5)`;

	const result = serializeError(error, {testFile});
	t.is(result.type, 'native');
	t.deepEqual(result.source, {
		isDependency: false,
		isWithinProject: true,
		file: testFile,
		line: 10,
	});
});

test('extractSource skips anonymous file paths that are not the test file', t => {
	const testFilePath = path.resolve('test-fixture.js');
	const testFile = pathToFileURL(testFilePath).toString();
	const error = new Error('boom');
	error.stack = `Error: boom
    at Object.<anonymous> (<anonymous>:1:2)
    at Object.<anonymous> (${testFilePath}:4:1)`;

	const result = serializeError(error, {testFile});
	t.is(result.type, 'native');
	t.deepEqual(result.source, {
		isDependency: false,
		isWithinProject: true,
		file: testFile,
		line: 4,
	});
});
