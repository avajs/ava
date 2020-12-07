const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots remain if tests fail', testSnapshotPruning, {
	cwd: exec.cwd('failing-assertion'),
	cli: ['--update-snapshots'],
	remove: false,
	error: {
		message: /.*Value is not truthy.*/
	}
});
