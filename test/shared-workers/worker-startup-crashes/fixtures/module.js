import test from 'ava';
import * as plugin from 'ava/plugin';

plugin.registerSharedWorker({
	filename: new URL('_module.js', import.meta.url),
	supportedProtocols: ['experimental'],
});

test('shared worker should cause tests to fail', t => {
	t.fail();
});

