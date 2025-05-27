import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('idle timeouts are not blocked by console output', async t => {
	const result = await t.throwsAsync(fixture(['console-output.js']));
	const error = result.stats.getError(result.stats.failed[0]);
	t.is(error && error.message, 'timeout despite console output');
});
