const plugin = require('ava/plugin');
const itFirst = require('it-first');

const worker = plugin.registerSharedWorker({
	filename: require.resolve('./_worker'),
	supportedProtocols: ['experimental']
});

exports.random = itFirst(worker.subscribe());
