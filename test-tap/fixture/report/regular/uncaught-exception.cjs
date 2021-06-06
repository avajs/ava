const test = require('../../../../entrypoints/main.cjs');

test('passes', t => {
	setImmediate(() => {
		throw new Error('Can’t catch me');
	});
	t.pass();
});
