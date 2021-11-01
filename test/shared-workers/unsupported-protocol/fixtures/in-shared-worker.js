import test from 'ava';
import * as plugin from 'ava/plugin';

plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['ava-4'],
});

test('shared worker should cause tests to fail', t => {
	t.fail();
});

