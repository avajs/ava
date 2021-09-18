import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('ok', async t => {
	await t.notThrowsAsync(fixture());
});
