const test = require('@ava/test');
const exec = require('../helpers/exec');
const {beforeAndAfter} = require('./helpers/macros');

test.serial(
	'Removing all snapshots from a test retains its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-all-snapshots'),
		expectChanged: false
	}
);

test.serial(
	'With --update-snapshots, removing all snapshots from a test removes the block',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-all-snapshots'),
		after: {cli: ['--update-snapshots']},
		expectChanged: true
	}
);
