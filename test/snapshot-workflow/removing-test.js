import test from '@ava/test';

import {resolveFixtureDirectory} from '../helpers/exec.js';

import {beforeAndAfter} from './helpers/macros.js';

test.serial(
	'Removing a test retains its data',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('removing-test'),
		expectChanged: false,
	},
);

test.serial(
	'With --update-snapshots, removing a test removes its block',
	beforeAndAfter,
	{
		cwd: resolveFixtureDirectory('removing-test'),
		cli: ['--update-snapshots'],
		expectChanged: true,
	},
);
