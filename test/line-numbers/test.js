const test = require('@ava/test');
const exec = require('../helpers/exec');

test('select test by line number', async t => {
	const result = await exec.fixture(['line-numbers.js', 'line-numbers.js:3']);

	t.is(result.stats.todo.length, 0);
	t.is(result.stats.passed.length, 1);
	t.deepEqual(result.stats.passed.map(passed => passed.title), ['unicorn']);
});

test('select serial test by line number', async t => {
	const result = await exec.fixture(['line-numbers.js:11']);

	t.is(result.stats.todo.length, 0);
	t.is(result.stats.passed.length, 1);
	t.deepEqual(result.stats.passed.map(passed => passed.title), ['cat']);
});

test('select todo test by line number', async t => {
	const result = await exec.fixture(['line-numbers.js:15']);

	t.is(result.stats.todo.length, 1);
	t.deepEqual(result.stats.todo.map(todo => todo.title), ['dog']);
});

test('select tests by line number range', async t => {
	const result = await exec.fixture(['line-numbers.js:5-7']);

	t.is(result.stats.todo.length, 0);
	t.is(result.stats.passed.length, 2);
	t.deepEqual(result.stats.passed.map(passed => passed.title), ['rainbow', 'unicorn']);
});

test('select two tests declared on same line', async t => {
	const result = await exec.fixture(['line-numbers.js:18']);

	t.is(result.stats.todo.length, 0);
	t.is(result.stats.passed.length, 2);
	t.deepEqual(result.stats.passed.map(passed => passed.title), ['moon', 'sun']);
});

test('select only one of two tests declared on same line', async t => {
	const result = await exec.fixture(['line-numbers.js:19']);

	t.is(result.stats.todo.length, 0);
	t.is(result.stats.passed.length, 1);
	t.deepEqual(result.stats.passed.map(passed => passed.title), ['moon']);
});

test('no test selected by line number', async t => {
	return t.throwsAsync(exec.fixture(['line-numbers.js:6']), {
		message: /Line numbers for line-numbers.js did not match any tests/
	});
});

test('parent call is not selected', async t => {
	return t.throwsAsync(exec.fixture(['line-numbers.js:23']), {
		message: /Line numbers for line-numbers.js did not match any tests/
	});
});

test('nested call is selected', async t => {
	const result = await exec.fixture(['line-numbers.js:24']);

	t.is(result.stats.todo.length, 0);
	t.is(result.stats.passed.length, 1);
	t.deepEqual(result.stats.passed.map(passed => passed.title), ['nested call']);
});
