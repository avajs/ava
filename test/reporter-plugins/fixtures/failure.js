import process from 'node:process';

import test from '../../../entrypoints/main.js';

test('fails', t => {
	if (process.env.PLUGIN_TEST_EXIT) {
		process.exit(2); // eslint-disable-line unicorn/no-process-exit
	}

	t.deepEqual({actual: true}, {expected: true});
});
