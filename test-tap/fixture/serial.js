import {setTimeout as delay} from 'node:timers/promises';

import test from '../../entrypoints/main.js';

const tests = [];

test('first', async t => {
	await delay(300);
	tests.push('first');
	t.pass();
});

test('second', async t => {
	await delay(100);
	tests.push('second');
	t.pass();
});

test('test', t => {
	t.deepEqual(tests, ['first', 'second']);
});
