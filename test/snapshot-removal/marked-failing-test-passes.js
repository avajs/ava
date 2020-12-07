const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');
const path = require('path');

test.serial('snapshots remain if any test.failing() passes', testSnapshotPruning, {
	cwd: exec.cwd(path.parse(__filename).name),
	cli: ['--update-snapshots'],
	remove: false,
	error: {
		message: /.*Test was expected to fail, but succeeded.*/
	}
});
