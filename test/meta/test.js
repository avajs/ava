import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('with CJS files', async t => {
	const result = await fixture(['meta.cjs']);
	t.is(result.stats.passed.length, 2);
});

test('with MJS files', async t => {
	const result = await fixture(['meta.mjs']);
	t.is(result.stats.passed.length, 2);
});
