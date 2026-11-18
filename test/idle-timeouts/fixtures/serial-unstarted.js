import {setTimeout as delay} from 'node:timers/promises';

import test from 'ava';

test.serial('first started', async t => {
	await delay(15_000);
	t.pass();
});

test.serial('second never started', t => {
	t.pass();
});
