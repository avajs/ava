import test from '@ava/test';

import {fixture} from '../../helpers/exec.js';

test('shared worker plugins work', async t => {
	const result = await fixture();
	t.snapshot(result.stats.passed);
});
