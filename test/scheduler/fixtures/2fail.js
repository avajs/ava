const test = require('ava');

test('fail', t => {
	t.fail(Date.now());
});
