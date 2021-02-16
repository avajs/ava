const test = require('@ava/test');
const exec = require('../helpers/exec');
const {beforeAndAfter} = require('./helpers/macros');

test.serial(
	'Removing a snapshot assertion retains its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-snapshots')
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test.serial(
	'With --update-snapshots, removing a snapshot assertion removes its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-snapshots'),
		after: {cli: ['--update-snapshots']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after removing a snapshot');
	}
);
