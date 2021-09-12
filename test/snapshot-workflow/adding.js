import {promises as fs} from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial('First run generates a .snap and a .md', async t => {
	await withTemporaryFixture(cwd('first-run'), async cwd => {
		const env = {
			AVA_FORCE_CI: 'not-ci',
		};

		await fixture([], {cwd, env});

		const [, report] = await Promise.all([
			t.notThrowsAsync(fs.access(path.join(cwd, 'test.js.snap'))),
			fs.readFile(path.join(cwd, 'test.js.md'), 'utf8'),
		]);
		t.snapshot(report, 'snapshot report');
	});
});

test.serial(
	'Adding more snapshots to a test adds them to the .snap and .md',
	beforeAndAfter,
	{
		cwd: cwd('adding-snapshots'),
		expectChanged: true,
	},
);

test.serial(
	'Adding a test with snapshots adds them to the .snap and .md',
	beforeAndAfter,
	{
		cwd: cwd('adding-test'),
		expectChanged: true,
	},
);

test.serial(
	'Changing a test\'s title adds a new block, puts the old block at the end',
	beforeAndAfter,
	{
		cwd: cwd('changing-title'),
		expectChanged: true,
	},
);

test.serial(
	'Adding skipped snapshots followed by unskipped snapshots records blanks',
	beforeAndAfter,
	{
		cwd: cwd('adding-skipped-snapshots'),
		expectChanged: true,
	},
);

test.serial(
	'Filling in blanks doesn\'t require --update-snapshots',
	beforeAndAfter,
	{
		cwd: cwd('filling-in-blanks'),
		expectChanged: true,
	},
);
