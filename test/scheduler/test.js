const test = require('@ava/test');
const exec = require('../helpers/exec');

test.before(() => {
	process.env.AVA_FORCE_CI = 'not-ci';
});

function getTimestamps(stats) {
	return {passed: BigInt(stats.getLogs(stats.passed[0])), failed: BigInt(stats.getError(stats.failed[0]).values[0].formatted)};
}

test.serial('failing tests come first', async t => {
	try {
		await exec.fixture(['1pass.js', '2fail.js']);
	} catch {}

	try {
		await exec.fixture(['-t', '--concurrency=1', '1pass.js', '2fail.js']);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.passed > timestamps.failed);
	}
});

test.serial('scheduler disabled when cache empty', async t => {
	await exec.fixture(['reset-cache']);
	try {
		await exec.fixture(['-t', '--concurrency=1', '1pass.js', '2fail.js']);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.passed < timestamps.failed);
	}
});

test.serial('scheduler disabled when cache disabled', async t => {
	try {
		await exec.fixture(['1pass.js', '2fail.js']);
	} catch {}

	try {
		await exec.fixture(['-t', '--concurrency=1', '--config', 'disabled-cache.cjs', '1pass.js', '2fail.js']);
	} catch (error) {
		const timestamps = getTimestamps(error.stats);
		t.true(timestamps.passed < timestamps.failed);
	}
});
