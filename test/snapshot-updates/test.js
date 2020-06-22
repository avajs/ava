const test = require('@ava/test');
const exec = require('../helpers/exec');
const figures = require('figures');
const chalk = require('chalk');

test('cannot update snapshots when file contains skipped tests', async t => {
	const result = await t.throwsAsync(exec.fixture('contains-skip.js', '-u'));
	t.snapshot(result.stats.failed, 'failed tests');
	t.snapshot(result.stats.skipped, 'skipped tests');
	t.snapshot(result.stats.unsavedSnapshots, 'files where snapshots could not be updated');
});

test('cannot update snapshots when file contains exclusive tests', async t => {
	const result = await exec.fixture('contains-only.js', '-u');
	t.snapshot(result.stats.failed, 'failed tests');
	t.snapshot(result.stats.passed, 'passed tests');
	t.snapshot(result.stats.unsavedSnapshots, 'files where snapshots could not be updated');
});

async function testInvalidInput(t, promise, expectedMessage) {
	const result = await t.throwsAsync(promise);
	t.is(`${chalk.red(figures.cross)} ${expectedMessage}`, result.stderr.trim());
}

test('cannot update snapshots when matching test titles', testInvalidInput, exec.fixture('contains-skip.js', '-u', '-m=snapshot'), 'Snapshots cannot be updated when matching specific tests.');

test('cannot update snapshots when selecting tests by line number', testInvalidInput, exec.fixture('contains-skip.js:4', '-u'), 'Snapshots cannot be updated when selecting specific tests by their line number.');
