import assert from 'assert';

import test from 'ava';
import * as plugin from 'ava/plugin';

let calledLast = false;
plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['experimental'],
	teardown() {
		assert(calledLast);
		console.log('🤗TEARDOWN CALLED');
	}
});

plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['experimental'],
	teardown() {
		calledLast = true;
	}
});

test('pass', t => {
	t.pass();
});
