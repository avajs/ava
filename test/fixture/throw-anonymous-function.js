import test from '../../';

test('throw an uncaught exception', t => {
	setImmediate(() => {
		throw () => {};
	});
	t.pass();
});
