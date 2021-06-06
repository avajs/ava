import test from 'ava';

import {random} from './_plugin.js';

test('the shared worker produces a random value', async t => {
	const {data} = await random;
	t.log(data);
	t.pass();
});
