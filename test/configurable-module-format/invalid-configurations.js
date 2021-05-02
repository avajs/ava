import test from '@ava/test';

import {cleanOutput, fixture} from '../helpers/exec.js';

test('cannot configure how js extensions should be loaded', async t => {
	const result = await t.throwsAsync(fixture(['--config', 'change-js-loading.config.js']));
	t.snapshot(cleanOutput(result.stderr));
});

test('cannot configure how cjs extensions should be loaded', async t => {
	const result = await t.throwsAsync(fixture(['--config', 'change-cjs-loading.config.js']));
	t.snapshot(cleanOutput(result.stderr));
});

test('cannot configure how mjs extensions should be loaded', async t => {
	const result = await t.throwsAsync(fixture(['--config', 'change-mjs-loading.config.js']));
	t.snapshot(cleanOutput(result.stderr));
});

test('custom extensions must be either commonjs or module', async t => {
	const result = await t.throwsAsync(fixture(['--config', 'bad-custom-type.config.js']));
	t.snapshot(cleanOutput(result.stderr));
});
