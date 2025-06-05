import test from 'ava';

import {fixture} from '../helpers/exec.js';

test('test()', async t => {
	const result = await t.throwsAsync(fixture(['test.js']));
	t.regex(result.stdout, /Expected an implementation/);
});

test('t.try()', async t => {
	const result = await t.throwsAsync(fixture(['try.js']));
	t.regex(result.stdout, /Expected an implementation/);
});
