import {setTimeout as delay} from 'node:timers/promises';
import test from 'ava';

test('timeout with console output', async t => {
	t.timeout(1000, 'timeout despite console output');
	for (let i = 0; await delay(100, true); i++) {
		if (i % 2 === 0) {
			console.log('stdout');
		} else {
			console.error('stderr');
		}
	}
});
