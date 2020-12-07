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
	error: {
		message: /.*Snapshots cannot be updated when matching specific tests.*/
	}
});

test.serial('snapshots remain if tests selected by line numbers', testSnapshotPruning, {
	cwd: exec.cwd('removal'),
	cli: ['test.js:3-12', '--update-snapshots'],
	remove: false,
	error: {
		message: /.*Snapshots cannot be updated when selecting specific tests by their line number.*/
	}
});
