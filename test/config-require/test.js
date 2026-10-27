import test from '@ava/test';

import {resolveFixtureDirectory, fixture} from '../helpers/exec.js';

test('loads required modules with arguments', async t => {
	const result = await fixture([], {cwd: resolveFixtureDirectory('with-arguments')});
	t.is(result.stats.passed.length, 2);
});

test('non-JSON arguments can be provided (worker threads)', async t => {
	const result = await fixture([], {cwd: resolveFixtureDirectory('non-json')});
	t.is(result.stats.passed.length, 1);
});

test('non-JSON arguments can be provided (child process)', async t => {
	const result = await fixture(['--no-worker-threads'], {cwd: resolveFixtureDirectory('non-json')});
	t.is(result.stats.passed.length, 1);
});

test('loads required modules, not as an array', async t => {
	const result = await fixture([], {cwd: resolveFixtureDirectory('single-argument')});
	t.is(result.stats.passed.length, 1);
});

test('calls default export', async t => {
	const result = await fixture([], {cwd: resolveFixtureDirectory('exports-default')});
	t.is(result.stats.passed.length, 1);
});

test('loads dependencies', async t => {
	const result = await fixture([], {cwd: resolveFixtureDirectory('require-dependency')});
	t.is(result.stats.passed.length, 1);
});

test('crashes if module cannot be loaded', async t => {
	const result = await t.throwsAsync(fixture([], {cwd: resolveFixtureDirectory('failed-import')}));
	t.is(result.stats.uncaughtExceptions.length, 1);
});
