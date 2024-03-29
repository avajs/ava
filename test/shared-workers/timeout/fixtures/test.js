import {setTimeout as delay} from 'node:timers/promises';

import test from 'ava';
import {registerSharedWorker} from 'ava/plugin';

registerSharedWorker({
	filename: new URL('worker.mjs', import.meta.url),
	supportedProtocols: ['ava-4'],
});

test('time out', async t => {
	await delay(10_000);

	t.pass();
});
