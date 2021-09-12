import test from '@ava/test';

import {cwd} from '../helpers/exec.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial(
	'Removing all snapshots from a test retains its data',
	beforeAndAfter,
	{
		cwd: cwd('removing-all-snapshots'),
		expectChanged: false,
	},
);

test.serial(
	'With --update-snapshots, removing all snapshots from a test removes the block',
	beforeAndAfter,
	{
		cwd: cwd('removing-all-snapshots'),
		cli: ['--update-snapshots'],
		expectChanged: true,
	},
);
