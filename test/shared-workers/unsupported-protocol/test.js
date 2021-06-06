import test from '@ava/test';

import {fixture} from '../../helpers/exec.js';

test('must negotiate a supported protocol in the test worker', async t => {
	const result = await t.throwsAsync(fixture(['in-test-worker.js']));
	const [uncaught] = result.stats.uncaughtExceptions;
	t.snapshot(uncaught.message.replace(/\([^)]+\)/, '(VERSION)'));
});

test('must negotiate a supported protocol in the shared worker', async t => {
	const result = await t.throwsAsync(fixture(['in-shared-worker.js']));
	const [error] = result.stats.sharedWorkerErrors;
	t.snapshot(error.message.replace(/\([^)]+\)/, '(VERSION)').replace(/(shared worker plugin at).+$/, '$1 FILE'));
});
