import test from '@ava/test';

import {cwd} from '../helpers/exec.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial(
	'With --update-snapshots, skipping snapshots preserves their data',
	beforeAndAfter,
	{
		cwd: cwd('skipping-snapshot'),
		cli: ['--update-snapshots'],
		expectChanged: false,
	},
);

test.serial(
	'With --update-snapshots and t.snapshot.skip(), other snapshots are updated',
	beforeAndAfter,
	{
		cwd: cwd('skipping-snapshot-update'),
		cli: ['--update-snapshots'],
		expectChanged: true,
	},
);

test.serial(
	'With --update-snapshots, skipping tests preserves their data',
	beforeAndAfter,
	{
		cwd: cwd('skipping-test'),
		cli: ['--update-snapshots'],
		expectChanged: false,
	},
);

test.serial(
	'With --update snapshots and test.skip(), other tests\' snapshots are updated',
	beforeAndAfter,
	{
		cwd: cwd('skipping-test-update'),
		cli: ['--update-snapshots'],
		expectChanged: true,
	},
);

test.serial(
	'With --update-snapshots and --match, only selected tests are updated',
	beforeAndAfter,
	{
		cwd: cwd('select-test-update'),
		cli: ['--update-snapshots', '--match', 'foo'],
		expectChanged: true,
	},
);

test.serial(
	'With --update-snapshots and line number selection, only selected tests are updated',
	beforeAndAfter,
	{
		cwd: cwd('select-test-update'),
		cli: ['--update-snapshots', 'test.js:3-5'],
		expectChanged: true,
	},
);
