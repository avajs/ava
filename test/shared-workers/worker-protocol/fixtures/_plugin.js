import * as plugin from 'ava/plugin';

export default plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['experimental'],
});
