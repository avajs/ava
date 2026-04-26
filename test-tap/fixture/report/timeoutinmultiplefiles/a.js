import {setTimeout as delay} from 'node:timers/promises';

import test from '../../../../entrypoints/main.js';

test('a passes', t => t.pass());

test('a slow', async t => {
	await delay(5000);
	t.pass();
});
test('a slow two', async t => {
	await delay(5000);
	t.pass();
});

test('a passes two', t => t.pass());
