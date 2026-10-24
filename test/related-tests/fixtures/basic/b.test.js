import test from 'ava';

import {three} from './sub/nested.js';

test('three', t => {
	t.is(three(), 3);
});
