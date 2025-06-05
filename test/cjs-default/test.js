import test from 'ava';

import {fixture} from '../helpers/exec.js';

test('ok', async t => {
	await t.notThrowsAsync(fixture());
});
