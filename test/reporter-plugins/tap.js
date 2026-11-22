import {once} from 'node:events';
import path from 'node:path';
import process from 'node:process';
import {PassThrough} from 'node:stream';
import {pathToFileURL} from 'node:url';

import test from '@ava/test';

import ReporterHost from '../../lib/plugin-support/reporter-host.js';
import {fixture, resolveFixtureDirectory, spawnFixture} from '../helpers/exec.js';

const cwd = resolveFixtureDirectory();
const monitor = pathToFileURL(path.join(cwd, 'monitor.js')).href;

const runOptions = (env = {}, options = {}) => ({
	cwd,
	env: {AVA_FORCE_CI: 'not-ci', FORCE_COLOR: '0', ...env},
	nodeOptions: ['--import', monitor],
	reject: false,
	...options,
});

const run = (args, env, options) => fixture(args, runOptions(env, options));

for (const mode of [{watch: true, debug: false}, {watch: false, debug: true}]) {
	test(`TAP configured by default is quietly inactive in ${mode.watch ? 'watch' : 'debug'} mode`, async t => {
		const stdout = new PassThrough();
		const stderr = new PassThrough();
		let output = '';
		let errors = '';
		stdout.on('data', chunk => {
			output += chunk;
		});
		stderr.on('data', chunk => {
			errors += chunk;
		});
		const host = new ReporterHost({
			plugins: [{namespace: 'tap', filename: new URL('../../lib/plugin-support/tap-plugin.js', import.meta.url), options: true}],
			projectDir: process.cwd(),
			colorLevel: 2,
			stdout,
			stderr,
		});
		t.teardown(() => host.close());
		await host.negotiate();
		await host.configure({flags: {tap: true}, mode});
		t.false(host.claimsStdout);
		t.is(output, '');
		t.is(errors, '');
	});
}

for (const [title, args, setting, enabled] of [
	['default', [], undefined, false],
	['false config', [], 'false', false],
	['negated flag', ['--no-tap'], undefined, false],
	['negated config', ['--no-tap'], 'true', false],
	['last negation wins', ['--tap', '--no-tap'], undefined, false],
	['config', [], 'true', true],
	['flag overrides config', ['--tap'], 'false', true],
	['alias', ['-t'], undefined, true],
	['last activation wins', ['--no-tap', '--tap'], undefined, true],
]) {
	test(`selects bundled TAP: ${title}`, async t => {
		const {exitCode, stdout, stderr} = await run(args, {TAP_SETTING: setting});
		t.is(exitCode, 0, stderr);
		t.is(stderr.includes('reporter-plugin-thread'), enabled);
		t.is(stdout.startsWith('TAP version 13\n'), enabled);
		if (!enabled) {
			return;
		}

		t.regex(stdout, /# pass 1/);
		t.regex(stdout, /# skip 1/);
		t.regex(stdout, /not ok \d+ - todo # TODO/);
		t.false(stdout.includes('worker stdout'));
		t.regex(stderr, /worker stdout/);
		t.regex(stderr, /worker stderr/);
	});
}

test('forced-color logs are stripped and notices never precede TAP on stdout', async t => {
	const {stdout, stderr, exitCode} = await run(['--tap', '--color'], {FORCE_COLOR: '1', PLUGIN_TEST_NOTICES: '1'});
	t.is(exitCode, 0, stderr);
	t.true(stdout.startsWith('TAP version 13\n'));
	t.regex(stdout, /red log/);
	t.false(stdout.includes('\u{1B}'));
	t.regex(stderr, /Experiments are enabled/);
});

for (const workerArgs of [[], ['--no-worker-threads']]) {
	test(`reports failures through the plugin (${workerArgs.length === 0 ? 'thread' : 'process'} workers)`, async t => {
		const {exitCode, stdout, stderr} = await run(['--tap', ...workerArgs, 'failure.js']);
		t.is(exitCode, 1, stderr);
		t.regex(stdout, /not ok 1 - fails/);
		t.regex(stdout, /assertion: t\.deepEqual\(\)/);
		t.regex(stdout, /failure\.js:\d+/);
		t.regex(stdout, /# fail 1/);
		t.false(stderr.includes('Plugin tap:'));
	});

	test(`reports process.exit through the plugin (${workerArgs.length === 0 ? 'thread' : 'process'} workers)`, async t => {
		const {exitCode, stdout, stderr} = await run(['--tap', ...workerArgs, 'failure.js'], {PLUGIN_TEST_EXIT: '1'});
		t.is(exitCode, 1, stderr);
		t.regex(stdout, /Exiting due to process\.exit\(\)/);
		t.regex(stdout, /# fail [1-9]/);
		t.false(stderr.includes('Plugin tap:'));
	});
}

test('missing imports produce a TAP crash rather than crashing the plugin', async t => {
	const {exitCode, stdout, stderr} = await run(['--tap', 'no-tests.js']);
	t.is(exitCode, 1, stderr);
	t.regex(stdout, /No tests found in no-tests\.js, make sure to import "ava"/);
	t.regex(stdout, /# fail 1/);
	t.false(stderr.includes('Plugin tap:'));
});

test('multiple files use the host-computed title prefixes', async t => {
	const {exitCode, stdout, stderr} = await run(['--tap', 'basic.js', 'failure.js']);
	t.is(exitCode, 1, stderr);
	t.regex(stdout, /basic \u{203A} passes/u);
	t.regex(stdout, /failure \u{203A} fails/u);
});

for (const args of [['--help'], ['--version']]) {
	test(`supports ${args[0]} with TAP enabled`, async t => {
		const {exitCode, stdout, stderr} = await run(['--tap', ...args]);
		t.is(exitCode, 0, stderr);
		t.false(stdout.includes('TAP version'));
		if (args[0] === '--help') {
			t.regex(stdout, /-t, --tap/);
		} else {
			t.regex(stdout, /^\d+\.\d+\.\d+/);
		}
	});
}

for (const [args, mode] of [[['--watch'], 'when using watch mode'], [['debug', 'basic.js'], 'when debugging']]) {
	test(`TAP reports its explicit mode restriction ${mode}`, async t => {
		const {exitCode, stdout, stderr} = await run([...args, '--tap']);
		t.is(exitCode, 1);
		t.is(stdout, '');
		t.true(stderr.includes(`The TAP reporter is not available ${mode}.`), stderr);
	});
}

test('SIGINT flushes the TAP plan before exiting', async t => {
	const child = spawnFixture(['--tap', 'pending.js'], runOptions());
	t.teardown(() => {
		if (child.exitCode === null) {
			child.kill();
		}
	});
	let output = '';
	while (!output.includes('waiting-for-interrupt')) {
		const [chunk] = await once(child.stderr, 'data'); // eslint-disable-line no-await-in-loop
		output += chunk;
	}

	child.kill('SIGINT');
	const {exitCode, stdout, stderr} = await child;
	t.is(exitCode, 1, stderr);
	t.true(stdout.startsWith('TAP version 13\n'));
	t.regex(stdout, /1\.\.1/);
	t.regex(stdout, /# fail 1/);
	t.false(stderr.includes('flush timed out'));
});
