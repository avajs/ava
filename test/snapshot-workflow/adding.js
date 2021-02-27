const test = require('@ava/test');

const exec = require('../helpers/exec');
const path = require('path');
const fs = require('fs').promises;
const {beforeAndAfter} = require('./helpers/macros');
const {withTemporaryFixture} = require('../helpers/with-temporary-fixture');

test.serial('First run generates a .snap and a .md',
	withTemporaryFixture(exec.cwd('first-run')),
	async (t, cwd) => {
		const env = {
			AVA_FORCE_CI: 'not-ci'
		};

		await exec.fixture([], {cwd, env});

		const [, report] = await Promise.all([
			t.notThrowsAsync(fs.access(path.join(cwd, 'test.js.snap'))),
			fs.readFile(path.join(cwd, 'test.js.md'), 'utf8')
		]);
		t.snapshot(report, 'snapshot report');
	}
);

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
