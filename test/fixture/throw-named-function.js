import test from '../../';

function fooFn() {}

test('throw an uncaught exception', () => {
	setImmediate(() => {
		throw fooFn;
	});
});
