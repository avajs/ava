const test = require('ava');
const plugin = require('ava/plugin');

const worker = plugin.registerSharedWorker({
	filename: require.resolve('./_worker.js'),
	supportedProtocols: ['experimental']
});

test('the shared worker becomes available', async t => {
	await t.notThrowsAsync(worker.available);
});
