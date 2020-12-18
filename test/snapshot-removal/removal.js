const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruningSafe} = require('./helpers/macros');

test('snapshots are removed when tests stop using them', testSnapshotPruningSafe, {
	cwd: exec.cwd('removal'),
	cli: ['--update-snapshots'],
	remove: true
});

test('snapshots remain if not updating', testSnapshotPruningSafe, {
	cwd: exec.cwd('removal'),
	cli: [],
	remove: false
});

test('snapshots remain if tests run with --match', testSnapshotPruningSafe, {
	cwd: exec.cwd('removal'),
	cli: ['--update-snapshots', '--match=\'*snapshot*\''],
	remove: false,
	checkRun: async (t, run) => {
		const result = await t.throwsAsync(run, undefined, 'Expected fixture to throw');
		t.snapshot(exec.cleanOutput(result.stderr), 'stderr');
	}
});

test('snapshots remain if tests selected by line numbers', testSnapshotPruningSafe, {
	cwd: exec.cwd('removal'),
	cli: ['test.js:3-12', '--update-snapshots'],
	remove: false,
	checkRun: async (t, run) => {
		const result = await t.throwsAsync(run, undefined, 'Expected fixture to throw');
		t.snapshot(exec.cleanOutput(result.stderr), 'stderr');
	}
});
