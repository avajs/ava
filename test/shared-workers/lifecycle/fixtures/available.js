const test = require('ava');
const plugin = require('ava/plugin');

const worker = plugin.registerSharedWorker({
	filename: require.resolve('./_worker.js'),
	supportedProtocols: ['experimental']
});

const availableImmediately = worker.currentlyAvailable;

test('the shared worker becomes available before tests start', t => {
	t.false(availableImmediately);
	t.true(worker.currentlyAvailable);
});
