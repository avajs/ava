import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

const options = {
	// The scheduler only works when not in CI, so trick it into believing it is
	// not in CI even when it's being tested by AVA's CI.
	env: {AVA_FORCE_CI: 'not-ci'},
};

function getTimestamps(stats) {
	return {passed: BigInt(stats.getLogs(stats.passed[0])), failed: BigInt(stats.getLogs(stats.failed[0]))};
}

test.serial('failing tests come first', async t => {
	try {
		await fixture(['1pass.js', '2fail.js'], options);
	} catch {}

	try {
		await fixture(['--concurrency=1', '1pass.js', '2fail.js'], options);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.failed < timestamps.passed);
	}
});

test.serial('scheduler disabled when cache empty', async t => {
	await fixture(['reset-cache'], options); // `ava reset-cache` resets the cache but does not run tests.
	try {
		await fixture(['--concurrency=1', '1pass.js', '2fail.js'], options);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.passed < timestamps.failed);
	}
});

test.serial('scheduler disabled when cache disabled', async t => {
	try {
		await fixture(['1pass.js', '2fail.js'], options);
	} catch {}

	try {
		await fixture(['--concurrency=1', '--config', 'disabled-cache.js', '1pass.js', '2fail.js'], options);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.passed < timestamps.failed);
	}
});

test.serial('scheduler disabled in CI', async t => {
	try {
		await fixture(['1pass.js', '2fail.js'], {env: {AVA_FORCE_CI: 'ci'}});
	} catch {}

	try {
		await fixture(['--concurrency=1', '--config', 'disabled-cache.js', '1pass.js', '2fail.js'], options);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.passed < timestamps.failed);
	}
});

test('reports the seed when --randomize is combined with --seed', async t => {
	const results = await fixture(['--randomize', '--seed=abc123', 'random-1.js', 'random-2.js', 'random-3.js']);
	t.true(results.stdout.includes('Randomized test order with seed abc123'));
});

test('reports a generated seed when --randomize is used without --seed', async t => {
	const results = await fixture(['--randomize', 'random-1.js', 'random-2.js', 'random-3.js']);
	t.regex(results.stdout, /Randomized test order with seed [0-9a-f]{16}/);
});

test('does not report a seed when --randomize is omitted', async t => {
	const results = await fixture(['random-1.js', 'random-2.js', 'random-3.js']);
	t.false(results.stdout.includes('Randomized test order'));
});

test('errors when --seed is provided with an empty value', async t => {
	const error = await t.throwsAsync(fixture(['--randomize', '--seed=', 'random-1.js']));
	const output = `${error.stdout}${error.stderr}`;
	t.true(output.includes('The --seed flag must be provided with a non-empty value'));
});
