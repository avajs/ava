const test = require('@ava/test');
const exec = require('../helpers/exec');
const {beforeAndAfter} = require('./helpers/macros');

test(
	'With --update-snapshots, skipping snapshots preserves their data',
	beforeAndAfter,
	{
		cwd: exec.cwd('skipping-snapshot'),
		after: {cli: ['--update-snapshots']},
		expectChanged: false
	}
);

test(
	'With --update-snapshots, skipping tests preserves their data',
	beforeAndAfter,
	{
		cwd: exec.cwd('skipping-test'),
		after: {cli: ['--update-snapshots']},
		expectChanged: false
	}
);
