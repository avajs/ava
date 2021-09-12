import * as plugin from 'ava/plugin';
import itFirst from 'it-first';

const worker = plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['experimental'],
});

export const random = itFirst(worker.subscribe());
