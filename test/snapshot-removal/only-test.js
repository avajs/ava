const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots remain if using test.only', testSnapshotPruning, {
	cwd: exec.cwd('only-test'),
	cli: ['--update-snapshots'],
	remove: false
});
