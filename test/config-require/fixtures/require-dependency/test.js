import test from 'ava';

import {required} from '@ava/stub';

test('loads dependencies', t => {
	t.true(required);
});
