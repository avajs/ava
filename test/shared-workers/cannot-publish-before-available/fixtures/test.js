import test from 'ava';
import * as plugin from 'ava/plugin';

test('cannot publish before ready', t => {
	const worker = plugin.registerSharedWorker({
		filename: new URL('_worker.js', import.meta.url),
		supportedProtocols: ['ava-4'],
	});

	t.throws(() => worker.publish(), {message: 'Shared worker is not yet available'});
});
