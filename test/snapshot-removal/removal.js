const test = require('@ava/test');
const exec = require('../helpers/exec');
const {testSnapshotPruning} = require('./helpers/macros');

test.serial('snapshots are removed when tests stop using them', testSnapshotPruning, {
	cwd: exec.cwd('removal'),
	cli: ['--update-snapshots'],
	remove: true
});

test.serial('snapshots remain if not updating', testSnapshotPruning, {
	cwd: exec.cwd('removal'),
	cli: [],
	remove: false
});

test.serial('snapshots remain if tests run with --match', testSnapshotPruning, {
	cwd: exec.cwd('removal'),
	cli: ['--update-snapshots', '--match=\'*snapshot*\''],
	remove: false,
	checkRun: async (t, run) => {
		const result = await t.throwsAsync(run, undefined, 'Expected fixture to throw');
		t.snapshot(exec.cleanOutput(result.stderr), 'stderr');
	}
});

test.serial('snapshots remain if tests selected by line numbers', testSnapshotPruning, {
	cwd: exec.cwd('removal'),
	cli: ['test.js:3-12', '--update-snapshots'],
	remove: false,
	checkRun: async (t, run) => {
		const result = await t.throwsAsync(run, undefined, 'Expected fixture to throw');
		t.snapshot(exec.cleanOutput(result.stderr), 'stderr');
	}
});
