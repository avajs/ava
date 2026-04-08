import {setTimeout as delay} from 'node:timers/promises';

import test from '../../../../entrypoints/main.js';

test('b passes', t => t.pass());

test('b slow', async t => {
	await delay(5000);
	t.pass();
});
test('b slow two', async t => {
	await delay(5000);
	t.pass();
});
test('b slow three', async t => {
	await delay(5000);
	t.pass();
});

test('b passes two', t => t.pass());
