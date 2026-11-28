import {setTimeout as delay} from 'node:timers/promises';

import test from 'ava';

test.before('hanging setup', async t => {
	t.log('connecting to fixture service');
	await delay(15_000);
});

test('never starts because before hook hangs', t => {
	t.pass();
});
