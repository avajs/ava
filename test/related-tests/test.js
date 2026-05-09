import test from '@ava/test';

import {cleanOutput, cwd, fixture} from '../helpers/exec.js';

test('runs tests related to a changed source file', async t => {
	const result = await fixture(['--related', 'source.js'], {cwd: cwd('basic')});

	t.deepEqual(result.stats.passed, [
		{file: 'source.test.js', title: 'source'},
	]);
});

test('runs a changed test file directly', async t => {
	const result = await fixture(['--related', 'source.test.js'], {cwd: cwd('basic')});

	t.deepEqual(result.stats.passed, [
		{file: 'source.test.js', title: 'source'},
	]);
});

test('runs all tests if the changed file is not in the dependency graph', async t => {
	const result = await fixture(['--related', 'not-depended-on.js'], {cwd: cwd('basic')});

	t.deepEqual(result.stats.passed, [
		{file: 'other.test.js', title: 'other'},
		{file: 'source.test.js', title: 'source'},
	]);
});

test('requires a changed source file path', async t => {
	const result = await t.throwsAsync(fixture(['--related'], {cwd: cwd('basic')}));

	t.regex(cleanOutput(result.stderr), /requires at least one changed source file path/);
});

test('rejects line numbers', async t => {
	const result = await t.throwsAsync(fixture(['--related', 'source.js:1'], {cwd: cwd('basic')}));

	t.regex(cleanOutput(result.stderr), /Line numbers cannot be used with the --related flag/);
});
