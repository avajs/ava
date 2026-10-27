import test from '@ava/test';

import {cleanOutput, resolveFixtureDirectory, fixture} from '../helpers/exec.js';

for (const [where, which] of [
	['top-level', 'top-level-duplicates'],
	['top-level and typescript', 'shared-duplicates'],
]) {
	test(`errors if ${where} extensions include duplicates`, async t => {
		const options = {
			cwd: resolveFixtureDirectory(which),
		};

		const result = await t.throwsAsync(fixture([], options));

		t.snapshot(cleanOutput(result.stderr), 'fails with message');
	});
}

test('errors if extensions is not an array', async t => {
	const result = await t.throwsAsync(fixture([], {
		cwd: resolveFixtureDirectory('object-form'),
	}));
	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});
