const test = require('@ava/test');
const exec = require('../helpers/exec');
const {beforeAndAfter} = require('./helpers/macros');

test.serial(
	'With --update-snapshots, skipping snapshots preserves their data',
	beforeAndAfter,
	{
		cwd: exec.cwd('skipping-snapshot'),
		after: {cli: ['--update-snapshots']},
		expectChanged: false
	}
);

test.serial(
	'With --update-snapshots and t.snapshot.skip(), other snapshots are updated',
	beforeAndAfter,
	{
		cwd: exec.cwd('skipping-snapshot-update'),
		after: {cli: ['--update-snapshots']},
		expectChanged: true
	}
);

test.serial(
	'With --update-snapshots, skipping tests preserves their data',
	beforeAndAfter,
	{
		cwd: exec.cwd('skipping-test'),
		after: {cli: ['--update-snapshots']},
		expectChanged: false
	}
);

test.serial(
	'With --update snapshots and test.skip(), other tests\' snapshots are updated',
	beforeAndAfter,
	{
		cwd: exec.cwd('skipping-test-update'),
		after: {cli: ['--update-snapshots']},
		expectChanged: true
	}
);

test.serial(
	'With --update-snapshots and --match, only selected tests are updated',
	beforeAndAfter,
	{
		cwd: exec.cwd('select-test-update'),
		after: {cli: ['--update-snapshots', '--match', 'foo']},
		expectChanged: true
	}
);

test.serial(
	'With --update-snapshots and line number selection, only selected tests are updated',
	beforeAndAfter,
	{
		cwd: exec.cwd('select-test-update'),
		after: {cli: ['--update-snapshots', 'test.js:3-5']},
		expectChanged: true
	}
);
