import {once} from 'node:events';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';

import test from '@ava/test';
import {temporaryDirectoryTask} from 'tempy';

import {available as watchAvailable} from '../../lib/watcher.js';
import {fixture, resolveFixtureDirectory, spawnFixture} from '../helpers/exec.js';

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

test('a plugin crash after fail-fast stops pending workers', async t => {
	const {exitCode, stderr, timedOut} = await run(
		['--tap', '--fail-fast', '--concurrency=2', 'failure.js', 'pending.js'],
		'fail-fast-crash',
		{timeout: 5000},
	);
	t.false(timedOut);
	t.is(exitCode, 1);
	t.regex(stderr, /observation failed after test failure/);
});

test.runIf(process.platform !== 'win32')('SIGINT shortens a flush after fail-fast', async t => {
	const child = spawnFixture(['--tap', '--fail-fast', 'failure.js'], {
		cwd,
		env: {AVA_FORCE_CI: 'not-ci', FORCE_COLOR: '0', PLUGIN_TEST_SCENARIO: 'flush-hang'},
		nodeOptions: ['--import', monitor],
		reject: false,
		timeout: 5000,
	});
	t.teardown(() => {
		if (child.exitCode === null) {
			child.kill();
		}
	});
	let output = '';
	while (!output.includes('"type":"run-end"')) {
		const [chunk] = await once(child.stdout, 'data'); // eslint-disable-line no-await-in-loop
		output += chunk;
	}

	child.kill('SIGINT');
	const {exitCode, stderr, timedOut} = await child;
	t.false(timedOut);
	t.is(exitCode, 1);
	t.regex(stderr, /flush timed out/);
});

test('closes the plugin host if setup fails before the run starts', async t => {
	await temporaryDirectoryTask(async directory => {
		const cache = path.join(directory, 'node_modules', '.cache', 'ava');
		await mkdir(cache, {recursive: true});
		await Promise.all([
			writeFile(path.join(cache, 'failing-tests.json'), '{}'),
			writeFile(path.join(directory, 'ava.config.mjs'), 'export default {files: ["*.test.js"]};'),
			writeFile(path.join(directory, 'first.test.js'), ''),
			writeFile(path.join(directory, 'second.test.js'), ''),
		]);
		const {exitCode, stderr, timedOut} = await run(['--tap'], undefined, {cwd: directory, timeout: 5000});
		t.false(timedOut);
		t.is(exitCode, 1);
		t.regex(stderr, /includes is not a function/);
	});
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
