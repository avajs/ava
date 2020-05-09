const plugin = require('ava/plugin');
plugin.registerSharedWorker({
	supportedProtocols: ['experimental']
});
