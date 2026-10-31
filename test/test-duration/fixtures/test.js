import {setTimeout as delay} from 'node:timers/promises';

import test from 'ava';

test('async test', async t => {
	await delay(105);
	t.pass();
});

test('sync test', t => {
	const start = Date.now();
	while (Date.now() < start + 105) {
		// Busy-wait to block the event loop
	}

	t.pass();
});
