import path from 'node:path';
import {pathToFileURL} from 'node:url';

import test from '@ava/test';

import {available as watchAvailable} from '../../lib/watcher.js';
import {fixture, resolveFixtureDirectory} from '../helpers/exec.js';

const cwd = resolveFixtureDirectory();
const monitor = pathToFileURL(path.join(cwd, 'monitor.js')).href;

const run = (args, scenario, options = {}) => fixture(args, {
	cwd,
	env: {AVA_FORCE_CI: 'not-ci', FORCE_COLOR: '0', PLUGIN_TEST_SCENARIO: scenario},
	nodeOptions: ['--import', monitor],
	reject: false,
	...options,
});

test('a stdout claimant crash aborts the CLI run', async t => {
	const {exitCode, stderr} = await run(['--tap', '--timeout=1s', 'pending.js'], 'crash');
	t.is(exitCode, 1);
	t.regex(stderr, /Plugin tap: observation failed/);
	t.false(stderr.includes('flush timed out'));
});

for (const watch of [false, true]) {
	const runTest = watch && !watchAvailable(cwd) ? test.skip : test;
	runTest(`a plugin crash without a stdout claim aborts the CLI ${watch ? 'watch' : 'run'}`, async t => {
		const args = ['--tap', 'pending.js', ...(watch ? ['--watch'] : [])];
		const {exitCode, stderr, timedOut} = await run(args, 'no-stdout', {timeout: 10_000});
		t.false(timedOut);
		t.is(exitCode, 1);
		t.regex(stderr, /Plugin tap: observation failed/);
		t.false(stderr.includes('flush timed out'));
	});
}

test('undeclared namespaced flags load the plugin then fail parsing', async t => {
	const {exitCode, stdout, stderr} = await run(['--tap-extra=value', '--tap-unknown'], 'normal');
	t.is(exitCode, 1);
	t.is(stdout, '');
	t.regex(stderr, /reporter-plugin-thread/);
	t.regex(stderr, /Unknown argument: tap-unknown/);
});
