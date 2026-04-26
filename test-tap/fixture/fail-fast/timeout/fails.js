import {setTimeout as delay} from 'node:timers/promises';

import test from '../../../../entrypoints/main.js';

test('slow pass', async t => {
	await delay(1000);
	t.pass();
});
