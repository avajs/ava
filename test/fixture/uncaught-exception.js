import test from '../../';

test('throw an uncaught exception', () => {
	setImmediate(() => {
		throw new Error(`Can't catch me!`);
	});
});
