import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('timeout message can be specified', async t => {
	const result = await t.throwsAsync(fixture(['custom-message.js']));
	const error = result.stats.getError(result.stats.failed[0]);
	t.is(error.message, 'time budget exceeded');
});

test('timeout messages must be strings', async t => {
	const result = await t.throwsAsync(fixture(['invalid-message.js']));
	const error = result.stats.getError(result.stats.failed[0]);
	t.snapshot(error.message, 'error message');
	t.snapshot(error.values, 'formatted values');
});
