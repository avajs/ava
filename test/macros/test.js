import test from 'ava';

import {fixture} from '../helpers/exec.js';

test('a-okay', async t => {
	const result = await fixture([]);
	t.is(result.stats.passed.length, 3);
});
