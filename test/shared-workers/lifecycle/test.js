import test from '@ava/test';

import {fixture} from '../../helpers/exec.js';

test('availability', async t => {
	await t.notThrowsAsync(fixture(['available.js']));
});

test('teardown', async t => {
	const result = await fixture('teardown.js');
	t.true(result.stderr.includes('TEARDOWN CALLED'));
});
