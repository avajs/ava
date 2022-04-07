import * as plugin from 'ava/plugin';

export const getWorker = key => {
	const worker = plugin.registerSharedWorker({
		key,
		filename: new URL('_worker.js', import.meta.url),
		supportedProtocols: ['ava-4'],
	});

	const messages = worker.subscribe();

	const random = messages.next().then(({value}) => value).finally(() => messages.return());

	return {random};
};
