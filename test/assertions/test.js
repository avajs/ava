import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('happy path', async t => {
	const result = await fixture(['happy-path.js']);
	t.snapshot(result.stats.passed.map(({title}) => title));
});
