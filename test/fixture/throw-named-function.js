const test = require('../../');

function fooFn() {}

test('throw an uncaught exception', t => {
	setImmediate(() => {
		throw fooFn
	});
});
