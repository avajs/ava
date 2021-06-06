const delay = require('delay');

const test = require('../../../../entrypoints/main.cjs');

test('slow pass', async t => {
	await delay(1000);
	t.pass();
});
