const test = require('@ava/test');
const exec = require('../helpers/exec');

test('errors if top-level files is an empty array', async t => {
	return t.throwsAsync(exec.fixture([], {
		cwd: exec.cwd('files')
	}), {
		message: /The ’files’ configuration must be an array containing glob patterns./
	});
});

test('errors if top-level ignoredByWatcher is an empty array', t => {
	return t.throwsAsync(exec.fixture([], {
		cwd: exec.cwd('ignored-by-watcher')
	}), {
		message: /The ’ignoredByWatcher’ configuration must be an array containing glob patterns./
	});
});
