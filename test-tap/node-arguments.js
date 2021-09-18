import {test} from 'tap';

import normalizeNodeArguments from '../lib/node-arguments.js';

test('combines arguments', async t => {
	t.same(
		await normalizeNodeArguments(['--require setup.cjs'], '--throw-deprecation --zero-fill-buffers'),
		[...process.execArgv, '--require setup.cjs', '--throw-deprecation', '--zero-fill-buffers'],
	);
	t.end();
});
