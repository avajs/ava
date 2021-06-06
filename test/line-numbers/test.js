import test from '@ava/test';

import {cleanOutput, fixture} from '../helpers/exec.js';

test('select test by line number', async t => {
	const result = await fixture(['line-numbers.js', 'line-numbers.js:3']);

	t.snapshot(result.stats.todo, 'no todo tests are selected');
	t.snapshot(result.stats.passed, 'selected tests pass');
});

test('select serial test by line number', async t => {
	const result = await fixture(['line-numbers.js:11']);

	t.snapshot(result.stats.todo, 'no todo tests are selected');
	t.snapshot(result.stats.passed, 'selected tests pass');
});

test('select todo test by line number', async t => {
	const result = await fixture(['line-numbers.js:15']);

	t.snapshot(result.stats.todo, 'selected todo test passes');
});

test('select tests by line number range', async t => {
	const result = await fixture(['line-numbers.js:5-7']);

	t.snapshot(result.stats.todo, 'no todo tests are selected');
	t.snapshot(result.stats.passed, 'selected tests pass');
});

test('select two tests declared on same line', async t => {
	const result = await fixture(['line-numbers.js:18']);

	t.snapshot(result.stats.todo, 'no todo tests are selected');
	t.snapshot(result.stats.passed, 'selected tests pass');
});

test('select only one of two tests declared on same line', async t => {
	const result = await fixture(['line-numbers.js:19']);

	t.snapshot(result.stats.todo, 'no todo tests are selected');
	t.snapshot(result.stats.passed, 'selected tests pass');
});

test('no test selected by line number', async t => {
	const result = await t.throwsAsync(fixture(['line-numbers.js:6']));

	t.snapshot(cleanOutput(result.stdout), 'fails with message');
});

test('parent call is not selected', async t => {
	const result = await t.throwsAsync(fixture(['line-numbers.js:23']));

	t.snapshot(cleanOutput(result.stdout), 'fails with message');
});

test('nested call is selected', async t => {
	const result = await fixture(['line-numbers.js:24']);

	t.snapshot(result.stats.todo, 'no todo tests are selected');
	t.snapshot(result.stats.passed, 'selected tests pass');
});
