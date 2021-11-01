import test from 'ava';
import * as plugin from 'ava/plugin';

const worker = plugin.registerSharedWorker({
	filename: new URL('_worker.js', import.meta.url),
	supportedProtocols: ['ava-4'],
});

const availableImmediately = worker.currentlyAvailable;

test('the shared worker becomes available before tests start', t => {
	t.false(availableImmediately);
	t.true(worker.currentlyAvailable);
});
