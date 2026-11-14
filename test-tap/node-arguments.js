import process from 'node:process';

import {test} from 'tap';

import normalizeNodeArguments from '../lib/node-arguments.js';

test('combines arguments', async t => {
	t.same(
		await normalizeNodeArguments(['--import setup.js'], '--throw-deprecation --zero-fill-buffers'),
		[...process.execArgv, '--import setup.js', '--throw-deprecation', '--zero-fill-buffers'],
	);
	t.end();
});

test('does not include process.execArgv unless explicitly forwarded', async t => {
	t.same(
		await normalizeNodeArguments(['--import setup.js'], '--throw-deprecation', false),
		['--import setup.js', '--throw-deprecation'],
	);
	t.end();
});
