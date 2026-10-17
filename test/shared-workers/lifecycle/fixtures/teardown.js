import assert from 'node:assert';

import test from 'ava';
import * as plugin from 'ava/plugin';

let isCalledLast = false;
plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['ava-4'],
	teardown() {
		assert.ok(isCalledLast);
		console.log('🤗TEARDOWN CALLED');
	},
});

plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['ava-4'],
	teardown() {
		isCalledLast = true;
	},
});

test('pass', t => {
	t.pass();
});
