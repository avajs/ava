import test from '../../';

function fooFn() {}

test('throw an uncaught exception', t => {
	setImmediate(() => {
		throw fooFn;
	});
	t.pass();
});
