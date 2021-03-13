const delay = require('delay');
const test = require('../../..');

test('test', async t => {
	Promise.resolve().then(() => {
		t.throws(throwSync());
	});

	await delay(20);
	t.pass();
});

function throwSync() {
	throw new Error('should be detected');
}
