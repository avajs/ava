import test from 'ava';
import * as plugin from 'ava/plugin';

plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['experimental'],
});

test('registering', t => {
	t.pass();
});
