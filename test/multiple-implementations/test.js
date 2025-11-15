import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('test()', async t => {
	const result = await t.throwsAsync(fixture(['test.js']));
	t.regex(result.stdout, /Expected an implementation/);
});

test('t.try()', async t => {
	const result = await t.throwsAsync(fixture(['try.js']));
	t.regex(result.stdout, /Expected an implementation/);
});

test('t.try() guardrails report errors', async t => {
	const result = await t.throwsAsync(fixture(['try-guards.js']));
	t.regex(result.stdout, /Can’t commit a result that was previously discarded/);
	t.regex(result.stdout, /Can’t discard a result that was previously committed/);
});
