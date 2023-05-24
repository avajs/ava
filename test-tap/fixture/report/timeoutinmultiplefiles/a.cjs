const delay = require('delay');

const test = require('../../../../entrypoints/main.cjs');

test('a passes', t => t.pass());

test('a slow', async t => {
	await delay(5000);
	t.pass();
});
test('a slow two', async t => {
	await delay(5000);
	t.pass();
});

test('a passes two', t => t.pass());
