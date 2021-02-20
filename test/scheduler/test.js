const test = require('@ava/test');
const exec = require('../helpers/exec');

test.before(() => {
	process.env.AVA_FORCE_CI = 'not-ci';
});

test.serial('failing tests come first', async t => {
	try {
		await exec.fixture(['1pass.js', '2fail.js']);
	} catch {}

	try {
		await exec.fixture(['--concurrency=1', '1pass.js', '2fail.js']);
	} catch (error) {
		t.snapshot(error.stdout);
	}
});

test.serial('scheduler disabled when cache empty', async t => {
	await exec.fixture(['reset-cache']);
	try {
		await exec.fixture(['--concurrency=1', '1pass.js', '2fail.js']);
	} catch (error) {
		t.snapshot(error.stdout);
	}
});

test.serial('scheduler disabled when cache disabled', async t => {
	try {
		await exec.fixture(['1pass.js', '2fail.js']);
	} catch {}

	try {
		await exec.fixture(['--concurrency=1', '--config', 'disabled-cache.cjs', '1pass.js', '2fail.js']);
	} catch (error) {
		t.snapshot(error.stdout);
	}
});
