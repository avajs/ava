import test from '@ava/test';

import {resolveFixtureDirectory} from '../helpers/exec.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial(
	'Changing a snapshot\'s label does not change the .snap or .md',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('changing-label'),
		expectChanged: false,
	},
);

test.serial(
	'With --update-snapshots, changing a snapshot\'s label updates the .snap and .md',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('changing-label'),
		cli: ['--update-snapshots'],
		expectChanged: true,
	},
);
