const plugin = require('ava/plugin');

plugin.registerSharedWorker({
	supportedProtocols: ['🙈'],
	filename: __filename
});
