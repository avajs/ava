import test from '../../../entrypoints/main.js';

import {readA, value} from './cycle-a.js';

test('cycle', t => {
	t.is(value, 42);
	t.is(readA(), 42);
});
