import test from 'ava';
import {load} from './dyn-nonstatic.js';

test('loads dynamically', async t => {
	const {one: result} = await load();
	t.is(result(), 1);
});
