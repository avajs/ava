import {setTimeout as delay} from 'node:timers/promises';

import test from 'ava';

test('async teardown', t => {
	t.teardown(() => delay(105));
	t.pass();
});

test('sync teardown', t => {
	t.teardown(() => {
		const start = Date.now();
		while (Date.now() < start + 105) {
			// Busy-wait to block the event loop
		}
	});
	t.pass();
});
