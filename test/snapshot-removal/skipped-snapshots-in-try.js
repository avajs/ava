const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruningSafe} = require('./helpers/macros');
const path = require('path');

test('snapshots remain if skipped in a discarded try()', testSnapshotPruningSafe, {
	cwd: exec.cwd(path.parse(__filename).name),
	cli: ['--update-snapshots'],
	remove: false,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.unsavedSnapshots, 'files where snapshots could not be updated');
	}
});
