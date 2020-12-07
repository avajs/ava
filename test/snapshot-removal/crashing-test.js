const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots remain if tests crash', testSnapshotPruning, {
	cwd: exec.cwd('crashing-test'),
	cli: ['--update-snapshots'],
	remove: false,
	error: {
		message: /.*Error thrown in test.*/
	}
});
