import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('idle timeouts are not blocked by console output', async t => {
	const result = await t.throwsAsync(fixture(['console-output.js']));
	const error = result.stats.getError(result.stats.failed[0]);
	if (error) {
		t.is(error.message, 'timeout despite console output');
		return;
	}

	t.true(result.stdout.includes('Timed out while running tests'));
});

test('idle timeout reports only started serial tests', async t => {
	const result = await t.throwsAsync(fixture(['serial-unstarted.js', '--timeout=2s']));
	t.regex(result.stdout, /1 test was pending in serial-unstarted\.js/);
	t.regex(result.stdout, /first started/);
	t.notRegex(result.stdout, /second never started/);
	t.regex(result.stdout, /1 test remained pending after a timeout/);
});

test('idle timeout reports started before hook and excludes unstarted tests', async t => {
	const result = await t.throwsAsync(fixture(['before-hook-timeout.js', '--timeout=2s']));
	t.regex(result.stdout, /1 hook was pending in before-hook-timeout\.js/);
	t.regex(result.stdout, /hanging setup/);
	t.regex(result.stdout, /connecting to fixture service/);
	t.notRegex(result.stdout, /never starts because before hook hangs/);
	t.regex(result.stdout, /1 hook remained pending after a timeout/);
});

test('idle timeout reports started hook in TAP output and excludes unstarted tests', async t => {
	const result = await t.throwsAsync(fixture(['before-hook-timeout.js', '--tap', '--timeout=2s']));
	t.regex(result.stdout, /not ok 1 - hanging setup/);
	t.notRegex(result.stdout, /never starts because before hook hangs/);
});

test('idle timeout reports started afterEach hook after test passes', async t => {
	const result = await t.throwsAsync(fixture(['after-each-hook-timeout.js', '--timeout=2s']));
	t.regex(result.stdout, /1 hook was pending in after-each-hook-timeout\.js/);
	t.regex(result.stdout, /afterEach hook for passes before teardown hangs/);
	t.regex(result.stdout, /1 hook remained pending after a timeout/);
});
