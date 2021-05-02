import test from '@ava/test';

import {fixture} from '../../helpers/exec.js';

test('shared worker plugins work', async t => {
	const result = await t.throwsAsync(fixture());
	t.snapshot(result.stats.passed);
	t.is(result.stats.sharedWorkerErrors[0].message, '🙈');
});
