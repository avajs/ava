import {setTimeout as delay} from 'node:timers/promises';

import test from '../../../../entrypoints/main.js';

test('a passes', t => t.pass());

test('a slow', async t => {
	t.log('this slow test prints useful debug message just text');
	await delay(5000);
	t.log('this never logs because test times out');
	t.pass();
});
test('a slow two', async t => {
	t.log('another useful debug message', {x: 5});
	await delay(5000);
	t.log('this never logs because test times out');
	t.pass();
});

test('a passes two', t => t.pass());
