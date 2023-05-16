import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test.only('load sculpt0r', async t => {
	const result = await fixture(['required-default/test.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));

	t.true(files.has('required-default/test.js'));
});
