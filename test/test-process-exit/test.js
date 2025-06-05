import test from 'ava';

import {fixture} from '../helpers/exec.js';

test('process.exit is intercepted', async t => {
	const result = await t.throwsAsync(fixture(['process-exit.js']));
	t.true(result.failed);
	t.like(result, {timedOut: false, isCanceled: false, isTerminated: false});
	t.is(result.stats.selectedTestCount, 3);
	t.is(result.stats.passed.length, 2);
	t.is(result.stats.processExits.length, 1);
});
