import test from '@ava/test';

import {cwd} from '../helpers/exec.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial(
	't.snapshot.skip() in discarded t.try() doesn\'t copy over old value',
	beforeAndAfter,
	{
		cwd: cwd('discard-skip'),
		cli: ['--update-snapshots'],
		expectChanged: true,
	},
);

test.serial(
	't.snapshot.skip() in committed t.try() does copy over old value',
	beforeAndAfter,
	{
		cwd: cwd('commit-skip'),
		cli: ['--update-snapshots'],
		expectChanged: false,
	},
);
