import * as plugin from 'ava/plugin';

const worker = plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['ava-4'],
});

const messages = worker.subscribe();
export const random = messages.next().then(({value}) => value).finally(() => messages.return()); // eslint-disable-line unicorn/prefer-top-level-await
