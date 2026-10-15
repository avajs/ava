import test from 'ava';

import {wasRequired} from './required.js';

test('loads when given as a single argument', t => {
	t.true(wasRequired);
});
