const test = require('ava');
const plugin = require('ava/plugin');
const {available} = plugin.registerSharedWorker({
	supportedProtocols: ['experimental'],
	filename: require.resolve('./_worker')
});

test('worker becomes available', async t => {
	await t.notThrowsAsync(available);
});
