const url = require('url');
const test = require('ava');
const plugin = require('ava/plugin');

const worker = plugin.registerSharedWorker({
	filename: url.pathToFileURL(require.resolve('./_worker.mjs')).toString(),
	supportedProtocols: ['experimental']
});

test('the shared worker becomes available', async t => {
	await t.notThrowsAsync(worker.available);
});
