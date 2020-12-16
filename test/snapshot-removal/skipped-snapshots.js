const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots remain if snapshot assertions are skipped (-u)', testSnapshotPruning, {
	cwd: exec.cwd('skipped-snapshots'),
	cli: ['--update-snapshots'],
	remove: false,
	checkRun: async (t, run) => {
		const result = await t.throwsAsync(run, {
			message: /Snapshot assertions cannot be skipped when updating snapshots/
		}, 'Expected fixture to throw');
		t.snapshot(result.stats.unsavedSnapshots, 'files where snapshots could not be updated');
	}
});

test.serial('snapshots remain if snapshot assertions are skipped (!-u)', testSnapshotPruning, {
	cwd: exec.cwd('skipped-snapshots'),
	cli: [],
	remove: false
});
