const delay = require('delay');

const test = require('../../entrypoints/main.cjs');

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
