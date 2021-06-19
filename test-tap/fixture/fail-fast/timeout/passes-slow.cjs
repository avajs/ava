const delay = require('delay');

const test = require('../../../../entrypoints/main.cjs');

test('slow pass with timeout', async t => {
	t.timeout(120);
	await delay(110);
	t.pass();
});
