import test from 'ava';

import declare from './_declare.js';
import plugin from './_plugin.js';

declare(import.meta.url);

test('test workers are released when they exit', async t => {
	for await (const message of plugin.subscribe()) {
		if ('cleanup' in message.data) {
			t.is(message.data.cleanup, new URL('other.test.js', import.meta.url).toString());
			return;
		}
	}
});
