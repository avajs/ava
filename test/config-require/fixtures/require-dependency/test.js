import {required} from '@ava/stub';
import test from 'ava';

test('loads dependencies', t => {
	t.true(required);
});
