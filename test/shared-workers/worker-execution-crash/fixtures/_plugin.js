const plugin = require('ava/plugin');

module.exports = plugin.registerSharedWorker({
	filename: require.resolve('./_worker'),
	supportedProtocols: ['experimental']
});
