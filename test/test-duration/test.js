import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('test duration of a long-running test', async t => {
	const result = await fixture(['test.js']);
	t.regex(result.stdout, /async test \(\d{3}ms\)/);
	t.regex(result.stdout, /sync test \(\d{3}ms\)/);
});

test('test duration of a long-running teardown', async t => {
	const result = await fixture(['teardown.js']);
	t.regex(result.stdout, /async teardown \(\d{3}ms\)/);
	t.regex(result.stdout, /sync teardown \(\d{3}ms\)/);
});
