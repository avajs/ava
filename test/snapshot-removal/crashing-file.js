const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots remain if test file crashes during declaration', testSnapshotPruning, {
	cwd: exec.cwd('crashing-file'),
	cli: ['--update-snapshots'],
	remove: false,
	error: {
		message: /.*Uncaught exception in test\.js.*Crashing during test declaration.*1 uncaught exception.*/s
	}
});
