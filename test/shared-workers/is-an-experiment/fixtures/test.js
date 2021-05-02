import * as plugin from 'ava/plugin';

plugin.registerSharedWorker({
	supportedProtocols: ['experimental']
});
