import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('load cts as commonjs (using an extensions array)', async t => {
	const result = await fixture(['*.cts', '--config', 'array-custom.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 1);
	t.true(files.has('test.cts'));
});

test('load cts as commonjs (using an extensions object)', async t => {
	const result = await fixture(['*.cts', '--config', 'object-custom.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 1);
	t.true(files.has('test.cts'));
});
