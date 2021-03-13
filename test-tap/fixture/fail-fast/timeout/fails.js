const delay = require('delay');
const test = require('../../../..');

test('slow pass', async t => {
	await delay(1000);
	t.pass();
});
