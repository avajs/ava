const delay = require('delay');
const test = require('../../entrypoints/main.cjs');

test('slow', async t => {
	await delay(5000);
	t.pass();
});

test('fast', t => t.pass());
