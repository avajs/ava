const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots remain if any test.failing()', testSnapshotPruning, {
	cwd: exec.cwd('marked-failing-test'),
	cli: ['--update-snapshots'],
	remove: false
});
