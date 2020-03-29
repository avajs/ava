'use strict';

const {test} = require('tap');
const normalizeNodeArguments = require('../lib/node-arguments');

test('combines arguments', async t => {
	t.deepEqual(
		await normalizeNodeArguments(['--require setup.js'], '--throw-deprecation --zero-fill-buffers'),
		[...process.execArgv, '--require setup.js', '--throw-deprecation', '--zero-fill-buffers']
	);
	t.end();
});
