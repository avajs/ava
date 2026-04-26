import {setTimeout as delay} from 'node:timers/promises';

import test from '../../entrypoints/main.js';

test('slow', async t => {
	t.log('helpful log of a pending test');
	await delay(5000);
	t.pass();
});

test('fast', t => t.pass());
