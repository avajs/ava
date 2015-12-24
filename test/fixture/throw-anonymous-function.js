import test from '../../';

test('throw an uncaught exception', () => {
	setImmediate(() => {
		throw () => {};
	});
});
