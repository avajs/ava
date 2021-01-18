const test = require('@ava/test');
const exec = require('../helpers/exec');

test('failing tests come first', async t => {
	try {
		await exec.fixture(['1pass.js', '2fail.js']);
	}catch (_) { }

	try {
		await exec.fixture(['--concurrency=1', '1pass.js', '2fail.js']);
	} catch(error) {
		t.snapshot(error.stdout);
	}
});
