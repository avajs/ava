import test from 'ava';
import {two} from './importing.js';

test('two', t => {
	t.is(two(), 2);
});
