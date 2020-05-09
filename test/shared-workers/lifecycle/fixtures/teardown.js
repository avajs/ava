const assert = require('assert');
const test = require('ava');
const plugin = require('ava/plugin');

let calledLast = false;
plugin.registerSharedWorker({
	filename: require.resolve('./_worker.js'),
	supportedProtocols: ['experimental'],
	teardown() {
		assert(calledLast);
		console.log('🤗TEARDOWN CALLED');
	}
});

plugin.registerSharedWorker({
	filename: require.resolve('./_worker.js'),
	supportedProtocols: ['experimental'],
	teardown() {
		calledLast = true;
	}
});

test('pass', t => {
	t.pass();
});
