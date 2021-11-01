import * as plugin from 'ava/plugin';

const worker = plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['ava4'],
});

const messages = worker.subscribe();
export const random = messages.next().then(({value}) => value).finally(() => messages.return());
