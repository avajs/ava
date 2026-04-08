import {setTimeout as delay} from 'node:timers/promises';

import test from '../../../../entrypoints/main.js';

test('passes needle', t => t.pass());

test('slow needle', async t => {
	await delay(5000);
	t.pass();
});
test('slow two', async t => {
	await delay(5000);
	t.pass();
});
test('slow three needle', async t => {
	await delay(5000);
	t.pass();
});

test('passes two', t => t.pass());
