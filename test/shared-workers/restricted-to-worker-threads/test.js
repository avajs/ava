import test from '@ava/test';

import {fixture} from '../../helpers/exec.js';

test('can only be used when worker threads are enabled', async t => {
	let result = await t.throwsAsync(fixture(['--no-worker-threads']));
	t.true(result.failed);
	t.true(result.stdout.includes('Error: Shared workers can be used only when worker threads are enabled'));
	result = await fixture([]);
	t.false(result.failed);
});
