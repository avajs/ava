import test from 'ava';

import {getWorker} from './_plugin.js';

const {random} = getWorker('test-1');

test('the shared worker produces a random value', async t => {
	const {data} = await random;
	t.log(data);
	t.pass();
});
