const test = require('@ava/test');
const exec = require('../helpers/exec');
const {beforeAndAfter} = require('./helpers/macros');

test.serial(
	'Removing a snapshot assertion retains its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-snapshots'),
		expectChanged: false
	}
);

test.serial(
	'With --update-snapshots, removing a snapshot assertion removes its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-snapshots'),
		after: {cli: ['--update-snapshots']},
		expectChanged: true
	}
);
