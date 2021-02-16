const test = require('@ava/test');
const exec = require('../helpers/exec');
const {beforeAndAfter} = require('./helpers/macros');

test.serial(
	'Changing a snapshot\'s label does not change the .snap or .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('changing-label'),
		expectChanged: false
	}
);

test.serial(
	'With --update-snapshots, changing a snapshot\'s label updates the .snap and .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('changing-label'),
		after: {cli: ['--update-snapshots']},
		expectChanged: true
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after changing a label');
	}
);
