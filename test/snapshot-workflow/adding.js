import {promises as fs} from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {resolveFixtureDirectory, fixture} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial('First run generates a .snap and a .md', async t => {
	await withTemporaryFixture(resolveFixtureDirectory('first-run'), async cwd => {
		const env = {
			AVA_FORCE_CI: 'not-ci',
		};

		await fixture([], {cwd, env});

		const snapPath = path.join(cwd, 'test.js.snap');
		const mdPath = path.join(cwd, 'test.js.md');
		const [, report] = await Promise.all([
			t.notThrowsAsync(fs.access(snapPath)),
			fs.readFile(mdPath, 'utf8'),
		]);
		t.snapshot(report, 'snapshot report');
	});
});

test.serial(
	'Adding more snapshots to a test adds them to the .snap and .md',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('adding-snapshots'),
		expectChanged: true,
	},
);

test.serial(
	'Adding a test with snapshots adds them to the .snap and .md',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('adding-test'),
		expectChanged: true,
	},
);

test.serial(
	'Changing a test\'s title adds a new block, puts the old block at the end',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('changing-title'),
		expectChanged: true,
	},
);

test.serial(
	'Adding skipped snapshots followed by unskipped snapshots records blanks',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('adding-skipped-snapshots'),
		expectChanged: true,
	},
);

test.serial(
	'Filling in blanks doesn\'t require --update-snapshots',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('filling-in-blanks'),
		expectChanged: true,
	},
);
