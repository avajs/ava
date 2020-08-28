const test = require('@ava/test');
const exec = require('../helpers/exec');

test('errors if top-level files is an empty array', async t => {
	const options = {
		cwd: exec.cwd('files')
	};

	await t.throwsAsync(exec.fixture([], options), {
		message: /The ’files’ configuration must be an array containing glob patterns./
	});
});

test('errors if top-level ignoredByWatcher is an empty array', async t => {
	const options = {
		cwd: exec.cwd('ignored-by-watcher')
	};

	await t.throwsAsync(exec.fixture([], options), {
		message: /The ’ignoredByWatcher’ configuration must be an array containing glob patterns./
	});
});
