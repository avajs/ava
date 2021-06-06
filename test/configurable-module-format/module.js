import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('load mjs as module (default configuration)', async t => {
	const result = await fixture(['*.mjs']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 1);
	t.true(files.has('test.mjs'));
});

test('load mjs as module (using an extensions array)', async t => {
	const result = await fixture(['*.mjs', '--config', 'array-extensions.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 1);
	t.true(files.has('test.mjs'));
});

test('load mjs as module (using an extensions object)', async t => {
	const result = await fixture(['*.mjs', '--config', 'object-extensions.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 1);
	t.true(files.has('test.mjs'));
});
