import test from '../../../../entrypoints/main.js';

test('passes', t => {
	setImmediate(() => {
		throw new Error('Can’t catch me');
	});
	t.pass();
});
