const delay = require('delay');

const test = require('../../../../entrypoints/main.cjs');

test('passes', t => t.pass());

test('slow', async t => {
	await delay(5000);
	t.pass();
});
test('slow two', async t => {
	await delay(5000);
	t.pass();
});

test('passes two', t => t.pass());
