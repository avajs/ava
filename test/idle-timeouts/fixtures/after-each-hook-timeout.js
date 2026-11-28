import {setTimeout as delay} from 'node:timers/promises';

import test from 'ava';

test('passes before teardown hangs', t => {
	t.pass();
});

test.afterEach(async () => {
	await delay(15_000);
});
