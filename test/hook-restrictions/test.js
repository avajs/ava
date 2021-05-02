import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('snapshots cannot be used in hooks', async t => {
	const result = await t.throwsAsync(fixture(['invalid-snapshots-in-hooks.js']));
	const error = result.stats.getError(result.stats.failedHooks[0]);
	t.snapshot(error.message, 'error message');
});

test('`t.try()` cannot be used in hooks', async t => {
	const result = await t.throwsAsync(fixture(['invalid-t-try-in-hooks.js']));
	const error = result.stats.getError(result.stats.failedHooks[0]);
	t.snapshot(error.message, 'error message');
});
