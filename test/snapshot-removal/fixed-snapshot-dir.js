const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruningSafe} = require('./helpers/macros');
const path = require('path');

test('snapshots are removed from a custom snapshotDir', testSnapshotPruningSafe, {
	cwd: exec.cwd(path.parse(__filename).name),
	cli: ['--update-snapshots'],
	remove: true,
	snapshotPath: path.join('fixedSnapshotDir', 'test.js.snap'),
	reportPath: path.join('fixedSnapshotDir', 'test.js.md')
});
