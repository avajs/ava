import {once} from 'node:events';
import {fileURLToPath} from 'node:url';

import test from '@ava/test';
import {execaNode} from 'execa';

const cli = fileURLToPath(new URL('../../entrypoints/cli.js', import.meta.url));
const cwd = fileURLToPath(new URL('fixtures', import.meta.url));
const monitor = new URL('fixtures/monitor.js', import.meta.url).href;

const run = (args, env = {}) => execaNode(cli, args, {
	cwd,
	env: {AVA_FORCE_CI: 'not-ci', FORCE_COLOR: '0', ...env},
	nodeOptions: ['--import', monitor],
	reject: false,
});

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

test('a stdout claimant crash aborts the CLI run', async t => {
	const {exitCode, stderr} = await run(['--tap', '--timeout=1s', 'pending.js'], {PLUGIN_TEST_CRASH: '1'});
	t.is(exitCode, 1);
	t.regex(stderr, /Plugin tap: observation failed/);
	t.false(stderr.includes('flush timed out'));
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

test('undeclared namespaced flags load the plugin then fail parsing', async t => {
	const {exitCode, stdout, stderr} = await run(['--tap-unknown']);
	t.is(exitCode, 1);
	t.is(stdout, '');
	t.regex(stderr, /reporter-plugin-thread/);
	t.regex(stderr, /Unknown argument: tap-unknown/);
});

for (const [args, mode] of [[['--watch'], 'when using watch mode'], [['debug', 'basic.js'], 'when debugging']]) {
	test(`TAP reports its explicit mode restriction ${mode}`, async t => {
		const {exitCode, stdout, stderr} = await run([...args, '--tap']);
		t.is(exitCode, 1);
		t.is(stdout, '');
		t.true(stderr.includes(`The TAP reporter is not available ${mode}.`), stderr);
	});
}

test('SIGINT flushes the TAP plan before exiting', async t => {
	const child = run(['--tap', 'pending.js']);
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
