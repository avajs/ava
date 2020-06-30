const test = require('@ava/test');
const exec = require('../helpers/exec');

test('snapshots cannot be used in hooks', async t => {
	const result = await t.throwsAsync(exec.fixture('invalid-snapshots-in-hooks.js'));

	t.snapshot(result.stats.failedHooks, 'files where snapshots failed in hooks');
});

test('snapshots cannot be used in `t.try()`', async t => {
	const result = await t.throwsAsync(exec.fixture('invalid-t-try-in-hooks.js'));

	t.regex(result.stdout, /before hook/);
	t.regex(result.stdout, /not allowed in hooks/);
	t.snapshot(result.stats.failedHooks, 'files where `t.try()` failed in hooks');
});
