const test = require('ava');
const plugin = require('ava/plugin');
plugin.registerSharedWorker({
	filename: require.resolve('./_module'),
	supportedProtocols: ['experimental']
});

test('shared worker should cause tests to fail', t => {
	t.fail();
});

