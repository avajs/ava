import test from 'ava';
import {load} from './dyn-static.js';

test('loads dynamically', async t => {
	const {one: result} = await load();
	t.is(result(), 1);
});
