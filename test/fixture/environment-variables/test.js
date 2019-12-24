const test = require('../../..');
const {name, value} = require('.');

test('works', t => {
	t.is(process.env[name], value);
});
