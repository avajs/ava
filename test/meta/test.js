import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('meta properties', async t => {
	const result = await fixture(['meta.js']);
	t.is(result.stats.passed.length, 3);
});

test('meta.debugMode is true when the main process is being inspected', async t => {
	const result = await fixture(['debug-mode.js'], {
		env: {AVA_FORCE_CI: 'not-ci', NODE_OPTIONS: '--inspect=0'},
	});
	t.is(result.stats.passed.length, 1);
});
