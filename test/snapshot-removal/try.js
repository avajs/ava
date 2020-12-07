const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');
const path = require('path');

test.serial('snapshots remain if used in a discarded try()', testSnapshotPruning, {
	cwd: exec.cwd(path.parse(__filename).name),
	cli: ['--update-snapshots'],
	remove: false
});
