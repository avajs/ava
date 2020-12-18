const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruningSafe} = require('./helpers/macros');

test('snapshots remain if using test.only', testSnapshotPruningSafe, {
	cwd: exec.cwd('only-test'),
	cli: ['--update-snapshots'],
	remove: false,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.unsavedSnapshots, 'files where snapshots could not be updated');
	}
});
