const test = require('../../');

test('throw an uncaught exception', t => {
	setImmediate(() => {
		throw function () {};
	});
});
