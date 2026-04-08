import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('idle timeouts are not blocked by console output', async t => {
	const result = await t.throwsAsync(fixture(['console-output.js']));
	const error = result.stats.getError(result.stats.failed[0]);
	if (error) {
		t.is(error.message, 'timeout despite console output');
		return;
	}

	t.true(result.stdout.includes('Timed out while running tests'));
});
