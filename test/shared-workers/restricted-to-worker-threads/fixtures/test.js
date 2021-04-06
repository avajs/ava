const test = require('ava');
const plugin = require('ava/plugin');

plugin.registerSharedWorker({
	filename: require.resolve('./_worker.js'),
	supportedProtocols: ['experimental']
});

test('registering', t => {
	t.pass();
});
