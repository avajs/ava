import test from 'ava';

import { multiply } from './index.js';

test('multiply', (t) => {
	t.is(multiply(1, 0), 0);
	t.is(multiply(2, 3), 6);
});
