const test = require('@ava/test');
const exec = require('../helpers/exec');

test('snapshots cannot be used in hooks', async t => {
	const result = await t.throwsAsync(exec.fixture('invalid-snapshots-in-hooks.js'));
	const error = result.stats.getError(result.stats.failedHooks[0]);
	t.snapshot(error.message, 'error message');
});

test('`t.try()` cannot be used in hooks', async t => {
	const result = await t.throwsAsync(exec.fixture('invalid-t-try-in-hooks.js'));
	const error = result.stats.getError(result.stats.failedHooks[0]);
	t.snapshot(error.message, 'error message');
});
