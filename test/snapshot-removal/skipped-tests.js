const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots remain if tests are skipped', testSnapshotPruning, {
	cwd: exec.cwd('skipped-tests'),
	cli: ['--update-snapshots'],
	remove: false
});
