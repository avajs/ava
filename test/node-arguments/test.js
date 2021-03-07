const test = require('@ava/test');
const exec = require('../helpers/exec');

test('passed node arguments to workers', async t => {
	const options = {
		cwd: exec.cwd('node-arguments')
	};

	// Removed --fill-zero-buffer because not supported in worker_threads
	const result = await exec.fixture(['--node-arguments="--throw-deprecation"', 'node-arguments.js'], options);

	t.snapshot(result.stats.passed, 'tests pass');
});

test('detects incomplete --node-arguments', async t => {
	const options = {
		cwd: exec.cwd('node-arguments')
	};

	const result = await t.throwsAsync(exec.fixture(['--node-arguments="--foo=\'bar"', 'node-arguments.js'], options));

	t.snapshot(exec.cleanOutput(result.stderr), 'fails with message');
});

test('reads node arguments from config', async t => {
	const options = {
		cwd: exec.cwd('node-arguments-from-config')
	};

	const result = await exec.fixture(['node-arguments-from-config.js'], options);

	t.snapshot(result.stats.passed, 'tests pass');
});
