import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('prints .because() reasons for failing, skipped and todo tests', async t => {
	const result = await fixture(['test.js']);

	t.regex(result.stdout, /\[expected fail\].*does foo/);
	t.regex(result.stdout, /- waiting on some\/repo#123/);

	t.regex(result.stdout, /\[skip\].*skipped/);
	t.regex(result.stdout, /- not ready yet/);

	t.regex(result.stdout, /\[todo\].*later/);
	t.regex(result.stdout, /- needs design/);

	t.is(result.stats.passed.length, 1);
	t.is(result.stats.skipped.length, 1);
	t.is(result.stats.todo.length, 1);
});
