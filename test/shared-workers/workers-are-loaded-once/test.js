import test from '@ava/test';

import {fixture} from '../../helpers/exec.js';

test('shared workers are loaded only once', async t => {
	const result = await fixture();
	const logs = result.stats.passed.map(object => result.stats.getLogs(object));
	t.is(logs.length, 2);
	t.deepEqual(logs[0], logs[1]);
});
