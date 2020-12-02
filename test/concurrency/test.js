const test = require('@ava/test');
const exec = require('../helpers/exec');

test('bails when --concurrency is provided without value', async t => {
	const result = await t.throwsAsync(exec.fixture(['--concurrency', 'concurrency.js']));

	t.snapshot(exec.cleanOutput(result.stderr), 'fails with message');
});

test('bails when --concurrency is provided with an input that is a string', async t => {
	const result = await t.throwsAsync(exec.fixture(['--concurrency=foo', 'concurrency.js']));

	t.snapshot(exec.cleanOutput(result.stderr), 'fails with message');
});

test('bails when --concurrency is provided with an input that is a float', async t => {
	const result = await t.throwsAsync(exec.fixture(['--concurrency=4.7', 'concurrency.js']));

	t.snapshot(exec.cleanOutput(result.stderr), 'fails with message');
});

test('bails when --concurrency is provided with an input that is negative', async t => {
	const result = await t.throwsAsync(exec.fixture(['--concurrency=-1', 'concurrency.js']));

	t.snapshot(exec.cleanOutput(result.stderr), 'fails with message');
});

test('works when --concurrency is provided with a value', async t => {
	await t.notThrowsAsync(exec.fixture(['--concurrency=1', 'concurrency.js']));
});
