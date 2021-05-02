const delay = require('delay');

const test = require('../../../entrypoints/main.cjs');

test('test', async t => {
	Promise.resolve().then(() => { // eslint-disable-line promise/prefer-await-to-then
		t.throws(throwSync());
	});

	await delay(20);
	t.pass();
});

function throwSync() {
	throw new Error('should be detected');
}
