const test = require('@ava/test');
const exec = require('../helpers/exec');

test('failing tests come first', async t => {
	process.env.AVA_FORCE_CI = 'not-ci';
	try {
		await exec.fixture(['1pass.js', '2fail.js']);
	} catch {}

	try {
		await exec.fixture(['--concurrency=1', '1pass.js', '2fail.js']);
	} catch (error) {
		t.snapshot(error.stdout);
	}

	delete process.env.AVA_FORCE_CI;
});
