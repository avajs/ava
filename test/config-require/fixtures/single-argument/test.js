import test from 'ava';

import {required} from './required.js';

test('loads when given as a single argument', t => {
	t.true(required);
});
