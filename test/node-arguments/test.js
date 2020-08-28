const test = require('@ava/test');
const exec = require('../helpers/exec');

test('passed node arguments to workers', async t => {
	const options = {
		cwd: exec.cwd('node-arguments')
	};

	const result = await exec.fixture(['--node-arguments="--throw-deprecation --zero-fill-buffers"', 'node-arguments.js'], options);

	t.is(result.stats.passed.length, 1);
});

test('detects incomplete --node-arguments', async t => {
	const options = {
		cwd: exec.cwd('node-arguments')
	};

	await t.throwsAsync(exec.fixture(['--node-arguments="--foo=\'bar"', 'node-arguments.js'], options), {
		message: /Could not parse `--node-arguments` value. Make sure all strings are closed and backslashes are used correctly./
	});
});

test('reads node arguments from config', async t => {
	const options = {
		cwd: exec.cwd('node-arguments-from-config')
	};

	const result = await exec.fixture(['node-arguments-from-config.js'], options);

	t.is(result.stats.passed.length, 1);
});
