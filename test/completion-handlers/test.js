import test from '@ava/test';

import {cleanOutput, fixture} from '../helpers/exec.js';

test('runs a single completion handler', async t => {
	const result = await fixture(['one.js']);
	t.is(cleanOutput(result.stderr), 'one');
});

test('runs multiple completion handlers in registration order', async t => {
	const result = await fixture(['two.js']);
	t.deepEqual(cleanOutput(result.stderr).split('\n'), ['one', 'two']);
});

test('completion handlers may exit the process', async t => {
	await t.notThrowsAsync(fixture(['exit0.js']));
});
