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
	t.snapshot(error.formattedDetails, 'formatted details');
});

test('timeouts are not blocked by console output', async t => {
	const result = await t.throwsAsync(fixture(['console-output.js']));
	const error = result.stats.getError(result.stats.failed[0]);
	t.snapshot(error.message, 'timeout despite console output');
});
