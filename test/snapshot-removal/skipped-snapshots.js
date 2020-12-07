const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots remain if snapshot assertions are skipped (-u)', testSnapshotPruning, {
	cwd: exec.cwd('skipped-snapshots'),
	cli: ['--update-snapshots'],
	remove: false,
	error: {
		message: /.*Snapshot assertions cannot be skipped when updating snapshots.*/
	}
});

test.serial('snapshots remain if snapshot assertions are skipped (!-u)', testSnapshotPruning, {
	cwd: exec.cwd('skipped-snapshots'),
	cli: [],
	remove: false
});
