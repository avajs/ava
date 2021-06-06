const test = require('../../../entrypoints/main.cjs');

test('test', t => {
	return new Promise(() => {
		t.pass();
	});
});
