const test = require('@ava/test');

const exec = require('../helpers/exec');
const path = require('path');
const fs = require('fs').promises;
const {beforeAndAfter} = require('./helpers/macros');

test.serial('First run generates a .snap and a .md', async t => {
	const cwd = exec.cwd('first-run');
	const env = {
		AVA_FORCE_CI: 'not-ci'
	};

	t.teardown(() => fs.unlink(path.join(cwd, 'test.js.md')));
	t.teardown(() => fs.unlink(path.join(cwd, 'test.js.snap')));

	await exec.fixture([], {cwd, env});

	await t.notThrowsAsync(fs.access(path.join(cwd, 'test.js.snap')));
	const report = await fs.readFile(path.join(cwd, 'test.js.md'), 'utf8');
	t.snapshot(report, 'snapshot report');
});

test.serial(
	'Adding more snapshots to a test adds them to the .snap and .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('adding-snapshots'),
		expectChanged: true
	}
);

test.serial(
	'Adding a test with snapshots adds them to the .snap and .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('adding-test'),
		expectChanged: true
	}
);

test.serial(
	'Changing a test\'s title adds a new block, puts the old block at the end',
	beforeAndAfter,
	{
		cwd: exec.cwd('changing-title'),
		expectChanged: true
	}
);

test.serial(
	'Adding skipped snapshots followed by unskipped snapshots records blanks',
	beforeAndAfter,
	{
		cwd: exec.cwd('adding-skipped-snapshots'),
		expectChanged: true
	}
);

test.serial(
	'Filling in blanks doesn\'t require --update-snapshots',
	beforeAndAfter,
	{
		cwd: exec.cwd('filling-in-blanks'),
		expectChanged: true
	}
);
