const test = require('../../');
const foo = require('./source-with-source-map-pragma');

test('throw an uncaught exception', t => {
	setImmediate(foo);
});
