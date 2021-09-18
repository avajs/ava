import * as plugin from 'ava/plugin';

plugin.registerSharedWorker({
	supportedProtocols: ['🙈'],
	filename: import.meta.url,
});
