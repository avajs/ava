import test from '@ava/test';

import {fixture} from '../../helpers/exec.js';

test('times out', async t => {
	const error = await t.throwsAsync(async () => fixture());

	t.is(error.exitCode, 1);
});
