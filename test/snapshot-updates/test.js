const test = require('@ava/test');
const exec = require('../helpers/exec');

test('cannot update snapshots when file contains skipped tests', async t => {
	const result = await t.throwsAsync(exec.fixture(['contains-skip.js', '-u']));
	t.snapshot(result.stats.failed, 'failed tests');
	t.snapshot(result.stats.skipped, 'skipped tests');
	t.snapshot(result.stats.unsavedSnapshots, 'files where snapshots could not be updated');
});

test('cannot update snapshots when file contains exclusive tests', async t => {
	const result = await exec.fixture(['contains-only.js', '-u']);
	t.snapshot(result.stats.failed, 'failed tests');
	t.snapshot(result.stats.passed, 'passed tests');
	t.snapshot(result.stats.unsavedSnapshots, 'files where snapshots could not be updated');
});

test('cannot update snapshots when matching test titles', async t => {
	const result = await t.throwsAsync(exec.fixture(['contains-skip.js', '-u', '-m=snapshot']));
	t.snapshot(exec.cleanOutput(result.stderr));
});

test('cannot update snapshots when selecting tests by line number', async t => {
	const result = await t.throwsAsync(exec.fixture(['contains-skip.js:4', '-u']));
	t.snapshot(exec.cleanOutput(result.stderr));
});

test('cannot update snapshots when skipping snapshot assertions', async t => {
	const result = await t.throwsAsync(exec.fixture(['contains-skip-assertion.js', '-u']));
	t.snapshot(result.stats.failed, 'failed tests');
	t.snapshot(result.stats.passed, 'passed tests');
	t.snapshot(result.stats.unsavedSnapshots, 'files where snapshots could not be updated');
});
