const test = require('@ava/test');
const exec = require('../helpers/exec');
const {beforeAndAfter} = require('./helpers/macros');

test.serial(
	'Removing a test retains its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-test'),
		expectChanged: false
	}
);

test.serial(
	'With --update-snapshots, removing a test removes its block',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-test'),
		after: {cli: ['--update-snapshots']},
		expectChanged: true
	}
);
