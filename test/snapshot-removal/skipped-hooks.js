const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots remain if hooks are skipped', testSnapshotPruning, {
	cwd: exec.cwd('skipped-hooks'),
	cli: ['--update-snapshots'],
	remove: false
});
