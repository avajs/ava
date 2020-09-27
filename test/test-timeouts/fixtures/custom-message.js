const test = require('ava');

test('timeout with custom message', async t => {
	t.timeout(10, 'time budget exceeded');
	await new Promise(() => {});
});
