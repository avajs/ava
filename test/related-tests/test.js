import {fileURLToPath} from 'node:url';

import test from '@ava/test';

import {cleanOutput, fixture} from '../helpers/exec.js';

const fixtureDir = fileURLToPath(new URL('fixtures/basic', import.meta.url));

test('runs tests related to a changed source file', async t => {
	const result = await fixture(['--find-related-tests', 'source.js'], {cwd: fixtureDir});

	t.deepEqual(result.stats.passed, [
		{file: 'source.test.js', title: 'source'},
	]);
});

test('runs tests related to an absolute changed source file path', async t => {
	const sourceFile = fileURLToPath(new URL('fixtures/basic/source.js', import.meta.url));
	const result = await fixture(['--find-related-tests', sourceFile], {cwd: fixtureDir});

	t.deepEqual(result.stats.passed, [
		{file: 'source.test.js', title: 'source'},
	]);
});

test('runs tests related to multiple changed source files', async t => {
	const result = await fixture(['--find-related-tests', 'source.js', 'other.js'], {cwd: fixtureDir});

	t.deepEqual(result.stats.passed, [
		{file: 'other.test.js', title: 'other'},
		{file: 'source.test.js', title: 'source'},
	]);
});

test('runs changed test files directly', async t => {
	const result = await fixture(['--find-related-tests', 'source.test.js'], {cwd: fixtureDir});

	t.deepEqual(result.stats.passed, [
		{file: 'source.test.js', title: 'source'},
	]);
});

test('runs all tests when a changed file is not in the dependency graph', async t => {
	const result = await fixture(['--find-related-tests', 'unrelated.js'], {cwd: fixtureDir});

	t.deepEqual(result.stats.passed, [
		{file: 'other.test.js', title: 'other'},
		{file: 'source.test.js', title: 'source'},
	]);
});

test('requires at least one changed source file path', async t => {
	const result = await t.throwsAsync(fixture(['--find-related-tests'], {cwd: fixtureDir}));

	t.regex(cleanOutput(result.stderr), /requires at least one changed source file path/);
});

test('rejects line numbers', async t => {
	const result = await t.throwsAsync(fixture(['--find-related-tests', 'source.js:1'], {cwd: fixtureDir}));

	t.regex(cleanOutput(result.stderr), /Line numbers cannot be used with the --find-related-tests flag/);
});
