import {setTimeout as delay} from 'node:timers/promises';

import test from '../../../../entrypoints/main.js';

test('a passes', t => t.pass());

test('a slow', async t => {
	t.log('hello world');
	await delay(15_000);
	t.log('this never prints due to test time out');
	t.pass();
});
test('a slow two', async t => {
	await delay(15_000);
	t.log('this never prints due to test time out');
	t.pass();
});

test('a passes two', t => t.pass());
