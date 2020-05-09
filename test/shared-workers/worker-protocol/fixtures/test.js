const path = require('path');
const test = require('ava');
const plugin = require('./_plugin');

require('./_declare')(__filename);

test('test workers are released when they exit', async t => {
	for await (const message of plugin.subscribe()) {
		if ('cleanup' in message.data) {
			t.is(message.data.cleanup, path.resolve(__dirname, 'other.test.js'));
			return;
		}
	}
});
