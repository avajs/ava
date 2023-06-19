import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';

test('loads required modules with arguments', async t => {
	const result = await fixture([], {cwd: cwd('with-arguments')});
	t.is(result.stats.passed.length, 2);
});

test('non-JSON arguments can be provided (worker threads)', async t => {
	const result = await fixture([], {cwd: cwd('non-json')});
	t.is(result.stats.passed.length, 1);
});

test('non-JSON arguments can be provided (child process)', async t => {
	const result = await fixture(['--no-worker-threads'], {cwd: cwd('non-json')});
	t.is(result.stats.passed.length, 1);
});

test('loads required modules, not as an array', async t => {
	const result = await fixture([], {cwd: cwd('single-argument')});
	t.is(result.stats.passed.length, 1);
});

test('calls exports.default (CJS)', async t => {
	const result = await fixture([], {cwd: cwd('exports-default')});
	t.is(result.stats.passed.length, 1);
});

test('crashes if module cannot be loaded', async t => {
	const result = await t.throwsAsync(fixture([], {cwd: cwd('failed-import')}));
	t.is(result.stats.uncaughtExceptions.length, 1);
});
