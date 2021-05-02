import test from '@ava/test';

import {cleanOutput, fixture} from '../helpers/exec.js';

test('bails when --concurrency is provided without value', async t => {
	const result = await t.throwsAsync(fixture(['--concurrency', 'concurrency.js']));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('bails when --concurrency is provided with an input that is a string', async t => {
	const result = await t.throwsAsync(fixture(['--concurrency=foo', 'concurrency.js']));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('bails when --concurrency is provided with an input that is a float', async t => {
	const result = await t.throwsAsync(fixture(['--concurrency=4.7', 'concurrency.js']));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('bails when --concurrency is provided with an input that is negative', async t => {
	const result = await t.throwsAsync(fixture(['--concurrency=-1', 'concurrency.js']));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('works when --concurrency is provided with a value', async t => {
	await t.notThrowsAsync(fixture(['--concurrency=1', 'concurrency.js']));
});
