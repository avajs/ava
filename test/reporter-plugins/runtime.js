import {once} from 'node:events';
import process from 'node:process';
import {PassThrough, Writable} from 'node:stream';
import {setImmediate} from 'node:timers/promises';

import test from '@ava/test';

import ReporterHost from '../../lib/plugin-support/reporter-host.js';

function setup(t, scenario, options = {}) {
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
		plugins: [{
			namespace: 'sample',
			filename: new URL(`fixtures/plugin.js?scenario=${scenario}`, import.meta.url),
			options: {configured: true},
		}],
		projectDir: process.cwd(),
		colorLevel: 2,
		reportStream: stdout,
		stdStream: stderr,
		...options,
	});
	t.teardown(() => host.close());
	return {
		host,
		output: () => output,
		errors: () => errors,
		async waitFor(text) {
			while (!output.includes(text)) {
				await once(stdout, 'data'); // eslint-disable-line no-await-in-loop
			}
		},
	};
}

async function start(host) {
	await host.negotiate();
	await host.configure({flags: {sample: true, 'sample-extra': 'value', unrelated: true}, mode: {watch: false, debug: false}});
}

const end = {
	type: 'run-end', runId: 1, totals: {}, suggestedExitCode: 0, reason: 'completed',
};

test('negotiates, isolates configure flags, and drains worker output before finishing', async t => {
	const {host, output, errors} = setup(t, 'tail');
	await start(host);
	host.publish({type: 'run-start', runId: 1, plan: {titlePrefixes: new Map()}});
	await host.finish(end);
	const [metadata, ...lines] = output().split('\n');
	const {context, forceColor, identifier} = JSON.parse(metadata);
	t.is(identifier, 'experimental');
	t.is(forceColor, '2');
	t.deepEqual(context.flags, {sample: true, 'sample-extra': 'value'});
	t.deepEqual(context.options, {configured: true});
	t.is(context.projectDir, process.cwd());
	t.deepEqual(context.terminal, {stdout: {colorLevel: 2}});
	t.deepEqual(lines.slice(0, 3).map(line => JSON.parse(line).seq), [0, 1, 2]);
	t.true(output().endsWith('x'.repeat(256 * 1024)));
	t.is(errors(), 'y'.repeat(256 * 1024));
});

for (const [scenario, message] of [
	['import-error', /plugin import failed/],
	['unsupported', /not compatible.*sample@1\.0\.0/],
	['namespace', /Invalid namespace/],
	['capability', /Invalid capabilities/],
	['activation', /boolean activation/],
	['flag', /conflicting flag --wrong-option/],
]) {
	test(`rejects invalid negotiation: ${scenario}`, async t => {
		const {host} = setup(t, scenario);
		await t.throwsAsync(host.negotiate(), {message});
	});
}

for (const [scenario, message] of [
	['configure-error', /configuration failed/],
	['claim-capability', /Invalid configuration result/],
	['diagnostic', /invalid options/],
]) {
	test(`rejects invalid configuration: ${scenario}`, async t => {
		const {host} = setup(t, scenario);
		await t.throwsAsync(start(host), {message});
	});
}

test('rejects flag collisions', async t => {
	const {host} = setup(t, 'normal', {reservedFlags: ['sample-extra']});
	await t.throwsAsync(host.negotiate(), {message: /conflicting flag --sample-extra/});
});

test('resolves stdout claims before activating plugins', async t => {
	const {host, output} = setup(t, 'normal', {
		plugins: ['sample', 'other'].map(namespace => ({
			namespace,
			filename: new URL(`fixtures/plugin.js?namespace=${namespace}`, import.meta.url),
		})),
	});
	await t.throwsAsync(start(host), {message: /Multiple plugins claim stdout/});
	t.is(output(), '');
});

test('inactive plugins finish quietly without observing', async t => {
	const {host, output, errors} = setup(t, 'inactive');
	await start(host);
	t.false(host.claimsStdout);
	t.true(host.plugins[0].stopped);
	t.is(output(), '');
	t.is(errors(), '');
});

test('inactive negotiation allows asynchronous finally cleanup to finish', async t => {
	const {host, errors} = setup(t, 'inactive-cleanup');
	await start(host);
	t.is(errors(), 'cleanup finished\n');
});

for (const scenario of ['unsupported-cleanup', 'diagnostic-cleanup']) {
	test(`host-side startup rejection allows finally cleanup: ${scenario}`, async t => {
		const {host, errors} = setup(t, scenario);
		await t.throwsAsync(start(host));
		await host.close();
		t.is(errors(), 'cleanup finished\n');
	});
}

for (const mode of [{watch: true, debug: false}, {watch: false, debug: true}]) {
	test(`TAP configured by default is quietly inactive in ${mode.watch ? 'watch' : 'debug'} mode`, async t => {
		const {host, output, errors} = setup(t, 'normal', {
			plugins: [{namespace: 'tap', filename: new URL('../../lib/plugin-support/tap-plugin.js', import.meta.url), options: true}],
		});
		await host.negotiate();
		await host.configure({flags: {tap: true}, mode});
		t.false(host.claimsStdout);
		t.is(output(), '');
		t.is(errors(), '');
	});
}

for (const scenario of ['startup-hang', 'ready-hang']) {
	test(`bounds startup: ${scenario}`, async t => {
		const {host} = setup(t, scenario, {startupTimeout: 1000});
		await t.throwsAsync(start(host), {message: /startup timed out/});
	});
}

test('waits for every observe handler at run-end and for its return at end-of-stream', async t => {
	const {host, waitFor} = setup(t, 'multiple');
	await start(host);
	let isAcknowledged = false;
	const synchronized = host.synchronize(end).then(() => {
		isAcknowledged = true;
	});
	await waitFor('"index":1,"type":"run-end"');
	t.false(isAcknowledged);
	host.plugins[0].worker.postMessage('release');
	await synchronized;
	isAcknowledged = false;
	const closing = host.synchronize({type: 'end-of-stream'}).then(() => {
		isAcknowledged = true;
	});
	await waitFor('"index":1,"type":"end-of-stream"');
	t.false(isAcknowledged);
	host.plugins[0].worker.postMessage('release');
	await closing;
	t.true(isAcknowledged);
});

test('run-end also waits for writes to the host destination', async t => {
	const written = Promise.withResolvers();
	let release;
	const reportStream = new Writable({
		write(chunk, encoding, callback) {
			if (release) {
				callback();
				return;
			}

			release = callback;
			written.resolve();
		},
	});
	const {host} = setup(t, 'normal', {reportStream});
	await start(host);
	await written.promise;
	let isAcknowledged = false;
	const replied = once(host.plugins[0].port, 'message');
	const synchronized = host.synchronize(end).then(() => {
		isAcknowledged = true;
	});
	await replied;
	await setImmediate();
	t.false(isAcknowledged);
	release();
	await synchronized;
	await host.synchronize({type: 'end-of-stream'});
});

test('an early returning handler no longer holds up acknowledgements', async t => {
	const {host, waitFor, errors} = setup(t, 'early');
	await start(host);
	host.publish({type: 'run-start', runId: 1, plan: {}});
	await waitFor('"type":"run-start"');
	await host.finish(end);
	t.is(errors(), '');
});

test('sequence gaps crash the stdout claimant', async t => {
	const {host} = setup(t, 'normal');
	await start(host);
	host.seq = 1;
	host.publish({type: 'run-start', runId: 1, plan: {}});
	await t.throwsAsync(host.failure.promise, {message: /sequence violation/});
});

test('handler failure aborts a stdout claimant', async t => {
	const {host} = setup(t, 'crash');
	await start(host);
	host.publish({type: 'run-start', runId: 1, plan: {}});
	await t.throwsAsync(host.failure.promise, {message: /observation failed/});
});

test('noncritical handler failure is surfaced without aborting', async t => {
	const {host} = setup(t, 'noncritical');
	const reported = Promise.withResolvers();
	host.onError = reported.resolve;
	await start(host);
	host.publish({type: 'run-start', runId: 1, plan: {}});
	const error = await reported.promise;
	t.regex(error.message, /observation failed/);
	t.false(host.claimsStdout);
	await host.finish(end);
});

test('unexpected thread exit is a failure even with exit code zero', async t => {
	const {host} = setup(t, 'exit-zero');
	await start(host);
	host.publish({type: 'run-start', runId: 1, plan: {}});
	await t.throwsAsync(host.failure.promise, {message: /thread exited unexpectedly \(code 0\)/});
});

test('a noncritical crash releases an outstanding acknowledgement', async t => {
	const {host, errors} = setup(t, 'noncritical');
	await start(host);
	await host.finish(end);
	t.regex(errors(), /observation failed/);
});

test('a claimant crash at run-end is fatal even after tests have finished', async t => {
	const {host} = setup(t, 'crash');
	await start(host);
	await t.throwsAsync(host.finish(end), {message: /observation failed/});
});

for (const interrupted of [false, true]) {
	test(`flush timeout terminates a stuck plugin (interrupted: ${interrupted})`, async t => {
		const {host, errors} = setup(t, 'flush-hang', {flushTimeout: interrupted ? 10_000 : 100, interruptTimeout: 100});
		await start(host);
		await host.finish(end, {interrupted});
		t.regex(errors(), /flush timed out/);
		t.true(host.flushTimedOut);
		t.true(host.plugins[0].stopped);
	});
}
