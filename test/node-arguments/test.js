import test from '@ava/test';

import {cleanOutput, cwd, fixture} from '../helpers/exec.js';

test('passed node arguments to workers', async t => {
	const options = {
		cwd: cwd('node-arguments'),
	};

	// Removed --fill-zero-buffer because not supported in worker_threads
	const result = await fixture(['--node-arguments="--throw-deprecation"', 'node-arguments.js'], options);

	t.snapshot(result.stats.passed, 'tests pass');
});

test('detects incomplete --node-arguments', async t => {
	const options = {
		cwd: cwd('node-arguments'),
	};

	const result = await t.throwsAsync(fixture(['--node-arguments="--foo=\'bar"', 'node-arguments.js'], options));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('reads node arguments from config', async t => {
	const options = {
		cwd: cwd('node-arguments-from-config'),
	};

	const result = await fixture(['node-arguments-from-config.js'], options);

	t.snapshot(result.stats.passed, 'tests pass');
});
