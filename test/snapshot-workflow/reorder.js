import test from '@ava/test';

import {resolveFixtureDirectory} from '../helpers/exec.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial(
	'Reordering tests does not change the .snap or .md',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('reorder'),
		expectChanged: false,
	},
);

test.serial(
	'With --update-snapshots, reordering tests reorders the .snap and .md',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('reorder'),
		cli: ['--update-snapshots'],
		expectChanged: true,
	},
);
