const test = require('../../');

test('throw an uncaught exception', t => {
	setImmediate(() => {
		throw new Error(`Can't catch me!`)
	});
});
