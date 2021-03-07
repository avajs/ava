const test = require('@ava/test');
const exec = require('../helpers/exec');

test('run in worker thread by default', async t => {
	const result = await exec.fixture([]);
	t.is(result.stats.passed.length, 1);
});

test('--no-worker-threads causes tests to run in a child process', async t => {
	const result = await t.throwsAsync(exec.fixture(['--no-worker-threads']));
	t.is(result.stats.failed.length, 1);
});

test('`workerThreads: false` configuration causes tests to run in a child process', async t => {
	const result = await t.throwsAsync(exec.fixture(['--config=child-process.config.mjs']));
	t.is(result.stats.failed.length, 1);
});
