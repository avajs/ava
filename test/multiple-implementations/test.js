import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('test()', async t => {
	const result = await t.throwsAsync(fixture(['test.js']));
	t.regex(result.stdout, /AVA 4 no longer supports multiple implementations/);
});

test('t.try()', async t => {
	const result = await t.throwsAsync(fixture(['try.js']));
	t.regex(result.stdout, /AVA 4 no longer supports t\.try\(\) with multiple implementations/);
});
