import test from '@ava/test';

import {cwd} from '../helpers/exec.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial(
	'Removing a snapshot assertion retains its data',
	beforeAndAfter,
	{
		cwd: cwd('removing-snapshots'),
		expectChanged: false,
	},
);

test.serial(
	'With --update-snapshots, removing a snapshot assertion removes its data',
	beforeAndAfter,
	{
		cwd: cwd('removing-snapshots'),
		cli: ['--update-snapshots'],
		expectChanged: true,
	},
);
