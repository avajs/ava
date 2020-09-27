const test = require('ava');
const plugin = require('ava/plugin');

test('cannot publish before ready', t => {
	const worker = plugin.registerSharedWorker({
		filename: require.resolve('./_worker'),
		supportedProtocols: ['experimental']
	});

	t.throws(() => worker.publish(), {message: 'Shared worker is not yet available'});
});
