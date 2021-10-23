import test from '@ava/test';

import {cleanOutput, cwd, fixture} from '../helpers/exec.js';

test('errors if top-level files is an empty array', async t => {
	const options = {
		cwd: cwd('files'),
	};

	const result = await t.throwsAsync(fixture([], options));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('errors if top-level ignoredByWatcher is an empty array', async t => {
	const options = {
		cwd: cwd('ignored-by-watcher'),
	};

	const result = await t.throwsAsync(fixture([], options));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('files can be filtered by directory', async t => {
	const options = {
		cwd: cwd('filter-by-directory'),
	};

	const result = await fixture(['directory'], options);
	t.snapshot(result.stats.passed);
});

test('additional files can be provided', async t => {
	const options = {
		cwd: cwd('treat-patterns-as-files'),
	};

	const result = await fixture(['foo.js', 'foo.ts', 'missing.js', '_helper.js', 'node_modules/test.js'], options);
	t.snapshot(result.stats.passed);
});
