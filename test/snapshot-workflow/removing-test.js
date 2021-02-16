const test = require('@ava/test');
const exec = require('../helpers/exec');
const {beforeAndAfter} = require('./helpers/macros');

test.serial(
	'Removing a test retains its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-test')
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test.serial(
	'With --update-snapshots, removing a test removes its block',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-test'),
		after: {cli: ['--update-snapshots']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after removing a test');
	}
);
