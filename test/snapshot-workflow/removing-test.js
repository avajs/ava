import test from '@ava/test';

import {cwd} from '../helpers/exec.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial(
	'Removing a test retains its data',
	beforeAndAfter,
	{
		cwd: cwd('removing-test'),
		expectChanged: false,
	},
);

test.serial(
	'With --update-snapshots, removing a test removes its block',
	beforeAndAfter,
	{
		cwd: cwd('removing-test'),
		cli: ['--update-snapshots'],
		expectChanged: true,
	},
);
