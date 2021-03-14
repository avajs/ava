const test = require('@ava/test');
const exec = require('../helpers/exec');

const options = {
	// The scheduler only works when not in CI, so trick it into believing it is
	// not in CI even when it's being tested by AVA's CI.
	env: {AVA_FORCE_CI: 'not-ci'}
};

function getTimestamps(stats) {
	return {passed: BigInt(stats.getLogs(stats.passed[0])), failed: BigInt(stats.getLogs(stats.failed[0]))};
}

test.serial('failing tests come first', async t => {
	try {
		await exec.fixture(['1pass.js', '2fail.js'], options);
	} catch {}

	try {
		await exec.fixture(['-t', '--concurrency=1', '1pass.js', '2fail.js'], options);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.failed < timestamps.passed);
	}
});

test.serial('scheduler disabled when cache empty', async t => {
	await exec.fixture(['reset-cache'], options); // `ava reset-cache` resets the cache but does not run tests.
	try {
		await exec.fixture(['-t', '--concurrency=1', '1pass.js', '2fail.js'], options);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.passed < timestamps.failed);
	}
});

test.serial('scheduler disabled when cache disabled', async t => {
	try {
		await exec.fixture(['1pass.js', '2fail.js'], options);
	} catch {}

	try {
		await exec.fixture(['-t', '--concurrency=1', '--config', 'disabled-cache.cjs', '1pass.js', '2fail.js'], options);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.passed < timestamps.failed);
	}
});
