const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');
const path = require('path');

test.serial('snapshots are removed from a custom snapshotDir', testSnapshotPruning, {
	cwd: exec.cwd(path.parse(__filename).name),
	cli: ['--update-snapshots'],
	remove: true,
	snapshotPath: path.join('fixedSnapshotDir', 'test.js.snap'),
	reportPath: path.join('fixedSnapshotDir', 'test.js.md')
});
