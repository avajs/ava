import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

// Regression test for https://github.com/avajs/ava/issues/3390
test('running 50 tests in a child process works as expected', async t => {
	const result = await fixture(['--no-worker-threads']);
	t.is(result.stats.passed.length, 50);
});
