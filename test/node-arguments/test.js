import test from '@ava/test';

import {cleanOutput, resolveFixtureDirectory, fixture} from '../helpers/exec.js';

test('passed node arguments to workers', async t => {
	const options = {
		cwd: resolveFixtureDirectory('node-arguments'),
	};

	// Removed --fill-zero-buffer because not supported in worker_threads
	const result = await fixture(['--node-arguments="--throw-deprecation"', 'node-arguments.js'], options);

	t.snapshot(result.stats.passed, 'tests pass');
});

test('`filterNodeArgumentsForWorkerThreads` configuration filters arguments for worker thread', async t => {
	const options = {
		cwd: resolveFixtureDirectory('thread-arguments-filter'),
	};

	const result = await fixture(['--config=thread-arguments-filter.config.js', 'thread.js'], options);

	t.snapshot(result.stats.passed, 'tests pass');
});

test('`filterNodeArgumentsForWorkerThreads` configuration ignored for worker process', async t => {
	const options = {
		cwd: resolveFixtureDirectory('thread-arguments-filter'),
	};

	const result = await fixture(['--config=thread-arguments-filter.config.js', '--no-worker-threads', 'process.js'], options);

	t.snapshot(result.stats.passed, 'tests pass');
});

// The test helper starts AVA with `--import`, which is how these tests observe whether `process.execArgv` is forwarded.
for (const [workerType, flags] of [['thread', []], ['process', ['--no-worker-threads']]]) {
	test(`arguments passed to node are forwarded to worker ${workerType} by default`, async t => {
		const options = {
			cwd: resolveFixtureDirectory('explicitly-forward-node-arguments'),
		};

		const result = await fixture([...flags, 'forwarded.js'], options);

		t.is(result.stats.passed.length, 1);
	});

	test(`\`explicitlyForwardNodeArguments: false\` prevents forwarding arguments passed to node to worker ${workerType}`, async t => {
		const options = {
			cwd: resolveFixtureDirectory('explicitly-forward-node-arguments'),
		};

		const result = await fixture(['--config=disabled.config.js', ...flags, 'not-forwarded.js'], options);

		t.is(result.stats.passed.length, 1);
	});
}

test('detects incomplete --node-arguments', async t => {
	const options = {
		cwd: resolveFixtureDirectory('node-arguments'),
	};

	const result = await t.throwsAsync(fixture(['--node-arguments="--foo=\'bar"', 'node-arguments.js'], options));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('reads node arguments from config', async t => {
	const options = {
		cwd: resolveFixtureDirectory('node-arguments-from-config'),
	};

	const result = await fixture(['node-arguments-from-config.js'], options);

	t.snapshot(result.stats.passed, 'tests pass');
});
