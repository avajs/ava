const test = require('@ava/test');
const exec = require('../helpers/exec');
const {beforeAndAfter} = require('./helpers/macros');

test.serial(
	't.snapshot.skip() in discarded t.try() doesn\'t copy over old value',
	beforeAndAfter,
	{
		cwd: exec.cwd('discard-skip'),
		cli: ['--update-snapshots'],
		expectChanged: true
	}
);

test.serial(
	't.snapshot.skip() in committed t.try() does copy over old value',
	beforeAndAfter,
	{
		cwd: exec.cwd('commit-skip'),
		cli: ['--update-snapshots'],
		expectChanged: false
	}
);
