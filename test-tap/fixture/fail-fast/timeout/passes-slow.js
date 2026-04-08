import {setTimeout as delay} from 'node:timers/promises';

import test from '../../../../entrypoints/main.js';

test('slow pass with timeout', async t => {
	t.timeout(120);
	await delay(110);
	t.pass();
});
