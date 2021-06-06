import test from '@ava/test';

import {fixture} from '../../helpers/exec.js';

test('handles crashes in factory function', async t => {
	const result = await t.throwsAsync(fixture(['factory-function.js']));
	const [error] = result.stats.sharedWorkerErrors;
	t.is(error.message, '🙈');
});

test('handles crashes in when there is no factory function', async t => {
	const result = await t.throwsAsync(fixture(['no-factory-function.js']));
	const [error] = result.stats.sharedWorkerErrors;
	t.snapshot(error.message.replace(/(shared worker plugin at).+$/, '$1 FILE'));
});

test('handles crashes in loading worker module', async t => {
	const result = await t.throwsAsync(fixture(['module.js']));
	const [error] = result.stats.sharedWorkerErrors;
	t.is(error.message, '🙊');
});
