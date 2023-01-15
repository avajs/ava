import test from '@ava/test';

import {fixture} from '../../helpers/exec.js';

test('can load multiple workers', async t => {
	await fixture();

	t.pass();
});
