import test from '@ava/test';

import {fixture} from '../helpers/exec.js';

test('load js and cjs (default configuration)', async t => {
	const result = await fixture(['*.js', '*.cjs']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 2);
	t.true(files.has('test.cjs'));
	t.true(files.has('test.js'));
});

test('load js and cjs (using an extensions array)', async t => {
	const result = await fixture(['*.js', '*.cjs', '--config', 'array-extensions.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 2);
	t.true(files.has('test.cjs'));
	t.true(files.has('test.js'));
});

test('load js and cjs (using an extensions object)', async t => {
	const result = await fixture(['*.js', '*.cjs', '--config', 'object-extensions.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 2);
	t.true(files.has('test.cjs'));
	t.true(files.has('test.js'));
});
