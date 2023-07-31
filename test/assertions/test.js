import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('happy path', async t => {
	const result = await fixture(['happy-path.js']);
	t.snapshot(result.stats.passed.map(({title}) => title));
});

test('throws requires native errors', async t => {
	const result = await t.throwsAsync(fixture(['throws.js']));
	t.snapshot(result.stats.passed.map(({title}) => title), 'passed tests');
	t.snapshot(result.stats.failed.map(({title}) => title), 'failed tests');
});

test('throwsAsync requires native errors', async t => {
	const result = await t.throwsAsync(fixture(['throws-async.js']));
	t.snapshot(result.stats.passed.map(({title}) => title), 'passed tests');
	t.snapshot(result.stats.failed.map(({title}) => title), 'failed tests');
});
