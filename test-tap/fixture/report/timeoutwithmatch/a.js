const delay = require('delay');
const test = require('../../../..');

test('passes needle', t => t.pass());

test('slow needle', async t => {
	await delay(15000);
	t.pass();
});
test('slow two', async t => {
	await delay(15000);
	t.pass();
});
test('slow three needle', async t => {
	await delay(15000);
	t.pass();
});

test('passes two', t => t.pass());
