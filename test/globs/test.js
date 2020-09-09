const test = require('@ava/test');
const exec = require('../helpers/exec');

test('errors if top-level files is an empty array', async t => {
	const options = {
		cwd: exec.cwd('files')
	};

	const result = await t.throwsAsync(exec.fixture([], options));

	t.snapshot(exec.cleanOutput(result.stderr), 'fails with message');
});

test('errors if top-level ignoredByWatcher is an empty array', async t => {
	const options = {
		cwd: exec.cwd('ignored-by-watcher')
	};

	const result = await t.throwsAsync(exec.fixture([], options));

	t.snapshot(exec.cleanOutput(result.stderr), 'fails with message');
});
