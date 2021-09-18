import test from '@ava/test';

import {cleanOutput, cwd, fixture} from '../helpers/exec.js';

for (const [where, which] of [
	['top-level', 'top-level-duplicates'],
	['top-level and typescript', 'shared-duplicates'],
]) {
	test(`errors if ${where} extensions include duplicates`, async t => {
		const options = {
			cwd: cwd(which),
		};

		const result = await t.throwsAsync(fixture([], options));

		t.snapshot(cleanOutput(result.stderr), 'fails with message');
	});
}
